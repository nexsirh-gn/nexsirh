import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/** Données nécessaires au rendu d'un bulletin au format GARAYA. */
export interface DonneesBulletin {
  entreprise: { name: string; address: string | null; nif: string | null; convention: string | null };
  salarie: {
    nom: string; matricule: string; poste: string | null;
    cnss: string | null; anciennete: string;
  };
  periode: string; // "Juin 2026"
  gains: { libelle: string; montant: number }[];
  cotisations: {
    baseCnss: number; cnssSal: number; cnssPat: number;
    baseRts: number; rts: number; baseVf: number; vf: number; brut: number; cfpa: number;
  };
  retenues: { libelle: string; montant: number }[];
  net: number;
  /** Cumuls depuis janvier de l'année en cours, bulletin courant inclus. */
  cumulsAnnuels?: { brut: number; cnssSal: number; rts: number; net: number };
}

const VERT = rgb(0.06, 0.36, 0.29);
const ENCRE = rgb(0.11, 0.14, 0.13);
const GRIS = rgb(0.36, 0.42, 0.4);

const gnf = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ");

export async function genererBulletinPDF(d: DonneesBulletin): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const M = 48; // marge
  const L = 595 - 2 * M; // largeur utile
  let y = 794;

  const texte = (t: string, x: number, taille = 9, f: PDFFont = fonte, couleur = ENCRE) =>
    page.drawText(t, { x, y, size: taille, font: f, color: couleur });
  const droite = (t: string, xFin: number, taille = 9, f: PDFFont = fonte, couleur = ENCRE) =>
    page.drawText(t, { x: xFin - f.widthOfTextAtSize(t, taille), y, size: taille, font: f, color: couleur });
  const ligne = (yl: number, epaisseur = 0.7, couleur = ENCRE) =>
    page.drawLine({ start: { x: M, y: yl }, end: { x: M + L, y: yl }, thickness: epaisseur, color: couleur });

  // ===== En-tête =====
  texte("BULLETIN DE PAIE", M, 15, gras, VERT);
  droite(`Période : ${d.periode}`, M + L, 10, gras);
  y -= 26;
  ligne(y + 8, 1.2);

  texte(d.entreprise.name, M, 11, gras);
  droite(d.salarie.nom, M + L, 11, gras);
  y -= 13;
  texte(d.entreprise.address ?? "", M, 8, fonte, GRIS);
  droite(`${d.salarie.poste ?? ""} - Mat. ${d.salarie.matricule}`, M + L, 8, fonte, GRIS);
  y -= 11;
  texte(d.entreprise.nif ? `NIF ${d.entreprise.nif}` : "", M, 8, fonte, GRIS);
  droite(d.salarie.cnss ? `N° CNSS ${d.salarie.cnss} - Ancienneté ${d.salarie.anciennete}` : `Ancienneté ${d.salarie.anciennete}`, M + L, 8, fonte, GRIS);
  y -= 11;
  texte(d.entreprise.convention ?? "", M, 8, fonte, GRIS);
  y -= 16;

  // ===== Tableau =====
  // Bords droits des 4 colonnes de montants (espacement suffisant pour 9 chiffres)
  const cols = { lib: M + 4, base: M + 235, gain: M + 315, retenue: M + 405, patron: M + L - 4 };
  const enTete = (pg: PDFPage) => {
    pg.drawRectangle({ x: M, y: y - 4, width: L, height: 16, color: rgb(0.906, 0.949, 0.933) });
    texte("Désignation", cols.lib, 8, gras);
    droite("Base", cols.base, 8, gras);
    droite("Gain", cols.gain, 8, gras);
    droite("Retenue sal.", cols.retenue, 8, gras);
    droite("Part patronale", cols.patron, 8, gras);
    y -= 18;
  };
  const rang = (lib: string, base: string, gain: string, ret: string, pat: string, f: PDFFont = fonte) => {
    texte(lib, cols.lib, 8.5, f);
    if (base) droite(base, cols.base, 8.5, f);
    if (gain) droite(gain, cols.gain, 8.5, f);
    if (ret) droite(ret, cols.retenue, 8.5, f);
    if (pat) droite(pat, cols.patron, 8.5, f);
    y -= 14;
  };

  ligne(y + 10, 1);
  enTete(page);

  // Gains
  let totalGains = 0;
  for (const g of d.gains) {
    if (g.montant > 0) {
      rang(g.libelle, "", gnf(g.montant), "", "");
      totalGains += g.montant;
    }
  }
  ligne(y + 10, 0.5);
  rang("TOTAL BRUT", "", gnf(totalGains), "", "", gras);
  ligne(y + 10, 0.5);

  // Cotisations
  const c = d.cotisations;
  rang("Cotisation CNSS (5 % / 18 %)", gnf(c.baseCnss), "", gnf(c.cnssSal), gnf(c.cnssPat));
  rang("RTS (barème progressif)", gnf(c.baseRts), "", gnf(c.rts), "");
  rang("Versement forfaitaire (6 %)", gnf(c.baseVf), "", "", gnf(c.vf));
  rang("CFPA (1,5 %)", gnf(c.brut), "", "", gnf(c.cfpa));
  ligne(y + 10, 0.5);
  rang("TOTAL COTISATIONS", "", "", gnf(c.cnssSal + c.rts), gnf(c.cnssPat + c.vf + c.cfpa), gras);
  ligne(y + 10, 0.5);

  // Retenues
  for (const r of d.retenues) {
    if (r.montant > 0) rang(r.libelle, "", "", gnf(r.montant), "");
  }

  // ===== Net à payer =====
  y -= 8;
  page.drawRectangle({ x: M, y: y - 6, width: L, height: 22, color: VERT });
  texte("NET À PAYER", cols.lib, 11, gras, rgb(1, 1, 1));
  droite(`${gnf(d.net)} GNF`, cols.patron, 11, gras, rgb(1, 1, 1));
  y -= 30;

  // ===== Cumuls annuels =====
  if (d.cumulsAnnuels) {
    const cu = d.cumulsAnnuels;
    page.drawRectangle({ x: M, y: y - 4, width: L, height: 16, color: rgb(0.906, 0.949, 0.933) });
    texte("Cumuls depuis janvier (période incluse)", cols.lib, 8, gras);
    y -= 18;
    rang("Brut cumulé", "", "", "", gnf(cu.brut));
    rang("CNSS salariale cumulée", "", "", "", gnf(cu.cnssSal));
    rang("RTS cumulé", "", "", "", gnf(cu.rts));
    rang("Net cumulé", "", "", "", gnf(cu.net), gras);
    y -= 6;
  }

  texte("Conservez ce bulletin sans limitation de durée.", M, 7.5, fonte, GRIS);
  y -= 10;
  texte(`Document généré par Nex'SIRH le ${new Date().toLocaleDateString("fr-FR")} - conforme Loi L/2014/072/CNT`, M, 7.5, fonte, GRIS);

  return doc.save();
}
