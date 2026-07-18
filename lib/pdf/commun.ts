import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/** Helpers de mise en page partagés par tous les documents PDF Nex'SIRH. */

export const VERT = rgb(0.06, 0.36, 0.29);
export const ENCRE = rgb(0.11, 0.14, 0.13);
export const GRIS = rgb(0.36, 0.42, 0.4);
export const MENTHE = rgb(0.906, 0.949, 0.933);

// U+202F (espace fine insécable) et U+00A0 : non encodables en WinAnsi → espace simple
export const versWinAnsi = (t: string) => t.replace(/[\u202F\u00A0\u2011\u2019]/g, (m) => (m === "\u2019" ? "'" : m === "\u2011" ? "-" : " "));
export const gnf = (n: number) => versWinAnsi(Math.round(n).toLocaleString("fr-FR"));
export const nombre = (n: number) => versWinAnsi(n.toLocaleString("fr-FR"));
export const dateFr = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR");

export interface EntetePDF {
  entreprise: { name: string; address?: string | null; nif?: string | null };
  titre: string;
  sousTitre?: string;
}

export class PagePDF {
  doc!: PDFDocument;
  page!: PDFPage;
  fonte!: PDFFont;
  gras!: PDFFont;
  y = 794;
  readonly M = 48;
  readonly L = 595 - 2 * 48;

  static async creer(): Promise<PagePDF> {
    const p = new PagePDF();
    p.doc = await PDFDocument.create();
    p.page = p.doc.addPage([595, 842]);
    p.fonte = await p.doc.embedFont(StandardFonts.Helvetica);
    p.gras = await p.doc.embedFont(StandardFonts.HelveticaBold);
    return p;
  }

  /** Nouvelle page si on approche du bas. */
  saut(minY = 90) {
    if (this.y < minY) {
      this.page = this.doc.addPage([595, 842]);
      this.y = 794;
    }
  }

  texte(t: string, x: number, taille = 9, f: PDFFont = this.fonte, couleur = ENCRE) {
    this.page.drawText(versWinAnsi(t), { x, y: this.y, size: taille, font: f, color: couleur });
  }
  droite(t: string, xFin: number, taille = 9, f: PDFFont = this.fonte, couleur = ENCRE) {
    t = versWinAnsi(t);
    this.page.drawText(t, { x: xFin - f.widthOfTextAtSize(t, taille), y: this.y, size: taille, font: f, color: couleur });
  }
  centre(t: string, taille = 9, f: PDFFont = this.fonte, couleur = ENCRE) {
    t = versWinAnsi(t);
    this.page.drawText(t, { x: this.M + (this.L - f.widthOfTextAtSize(t, taille)) / 2, y: this.y, size: taille, font: f, color: couleur });
  }
  ligne(epaisseur = 0.7, couleur = ENCRE, decalage = 0) {
    this.page.drawLine({
      start: { x: this.M, y: this.y + decalage },
      end: { x: this.M + this.L, y: this.y + decalage },
      thickness: epaisseur, color: couleur,
    });
  }

  entete(e: EntetePDF) {
    this.texte(e.titre.toUpperCase(), this.M, 15, this.gras, VERT);
    if (e.sousTitre) this.droite(e.sousTitre, this.M + this.L, 10, this.gras);
    this.y -= 26;
    this.ligne(1.2, ENCRE, 8);
    this.texte(e.entreprise.name, this.M, 11, this.gras);
    this.y -= 12;
    const infos = [e.entreprise.address, e.entreprise.nif ? `NIF ${e.entreprise.nif}` : null].filter(Boolean).join(" - ");
    if (infos) { this.texte(infos, this.M, 8, this.fonte, GRIS); this.y -= 12; }
    this.y -= 10;
  }

  pied(mention = "") {
    this.y = 56;
    if (mention) { this.texte(mention, this.M, 7.5, this.fonte, GRIS); this.y -= 10; }
    this.texte(
      `Document généré par Nex'SIRH le ${dateFr(new Date())} - conforme Loi L/2014/072/CNT`,
      this.M, 7.5, this.fonte, GRIS
    );
  }

  /** Paragraphe avec retour à la ligne automatique (lettres officielles). */
  paragraphe(t: string, taille = 10, interligne = 15, f: PDFFont = this.fonte) {
    const mots = t.split(/\s+/);
    let lg = "";
    for (const mot of mots) {
      const essai = lg ? `${lg} ${mot}` : mot;
      if (f.widthOfTextAtSize(essai, taille) > this.L) {
        this.saut();
        this.texte(lg, this.M, taille, f);
        this.y -= interligne;
        lg = mot;
      } else {
        lg = essai;
      }
    }
    if (lg) { this.saut(); this.texte(lg, this.M, taille, f); this.y -= interligne; }
  }

  /**
   * Tableau générique : colonnes = [libellé, largeur relative, alignement].
   * Les largeurs relatives sont normalisées sur la largeur utile.
   */
  tableau(
    colonnes: { titre: string; largeur: number; droite?: boolean }[],
    lignes: string[][],
    opts: { totaux?: string[]; taille?: number } = {}
  ) {
    const taille = opts.taille ?? 8.5;
    const totalLarg = colonnes.reduce((s, c) => s + c.largeur, 0);
    const xs: number[] = [];
    let acc = this.M;
    for (const c of colonnes) { xs.push(acc); acc += (c.largeur / totalLarg) * this.L; }
    const xFin = (i: number) => (i + 1 < xs.length ? xs[i + 1] - 8 : this.M + this.L - 4);

    const rang = (vals: string[], f: PDFFont) => {
      this.saut();
      vals.forEach((v, i) => {
        if (!v) return;
        if (colonnes[i].droite) this.droite(v, xFin(i), taille, f);
        else this.texte(v, xs[i] + (i === 0 ? 4 : 0), taille, f);
      });
      this.y -= 14;
    };

    // En-tête
    this.saut();
    this.page.drawRectangle({ x: this.M, y: this.y - 4, width: this.L, height: 16, color: MENTHE });
    colonnes.forEach((c, i) => {
      if (c.droite) this.droite(c.titre, xFin(i), 8, this.gras);
      else this.texte(c.titre, xs[i] + (i === 0 ? 4 : 0), 8, this.gras);
    });
    this.y -= 18;

    for (const l of lignes) rang(l, this.fonte);

    if (opts.totaux) {
      this.ligne(0.5, ENCRE, 10);
      rang(opts.totaux, this.gras);
    }
  }

  /** Bloc étiquette / valeur (fiches). */
  champ(label: string, valeur: string, xLabel: number, xValeur: number) {
    this.texte(label, xLabel, 8, this.fonte, GRIS);
    this.texte(valeur || "—", xValeur, 9.5, this.fonte);
    this.y -= 16;
  }

  /** Bandeau de total (style « net à payer »). */
  bandeau(libelle: string, valeur: string) {
    this.saut();
    this.page.drawRectangle({ x: this.M, y: this.y - 6, width: this.L, height: 22, color: VERT });
    this.texte(libelle, this.M + 4, 11, this.gras, rgb(1, 1, 1));
    this.droite(valeur, this.M + this.L - 4, 11, this.gras, rgb(1, 1, 1));
    this.y -= 34;
  }

  async sauver(): Promise<Uint8Array> {
    return this.doc.save();
  }
}
