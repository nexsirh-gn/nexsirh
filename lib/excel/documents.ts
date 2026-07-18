import "server-only";
import ExcelJS from "exceljs";
import type { Entreprise, Salarie, LignePaie } from "@/lib/pdf/documents";

/**
 * Classeurs Excel des documents administratifs — mise en page fidèle à
 * l'ancien SIRH Excel : bandeau titre coloré, bloc employeur, en-têtes
 * stylés, lignes de totaux, pied « Document généré le … ».
 */

const COULEURS = {
  vert: "FF1E7145",     // déclaration CNSS
  or: "FFB8860B",       // registre, état des salaires, fiche
  rouge: "FF8B1A1A",    // état RTS
  sarcelle: "FF17817B", // suivi des congés
  enteteBleu: "FFB8CCE4",
  totaux: "FFDCE6F1",
};

const dateFr = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "-");

function nouveauClasseur(nomFeuille: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nex'SIRH";
  const ws = wb.addWorksheet(nomFeuille);
  return { wb, ws };
}

/** Bandeau titre fusionné + sous-titre italique. */
function bandeau(ws: ExcelJS.Worksheet, nbCols: number, titre: string, sousTitre: string, couleur: string) {
  ws.mergeCells(1, 1, 1, nbCols);
  const t = ws.getCell(1, 1);
  t.value = titre;
  t.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: couleur } };
  ws.getRow(1).height = 24;
  ws.mergeCells(2, 1, 2, nbCols);
  const s = ws.getCell(2, 1);
  s.value = sousTitre;
  s.font = { italic: true, size: 10 };
  s.alignment = { horizontal: "center" };
}

/** Bloc employeur (raison sociale, NIF, adresse). */
function blocEmployeur(ws: ExcelJS.Worksheet, ligne: number, e: Entreprise, colNif = 4) {
  ws.getCell(ligne, 1).value = "EMPLOYEUR";
  ws.getCell(ligne, 1).font = { bold: true };
  ws.getCell(ligne + 1, 1).value = "Raison sociale :";
  ws.getCell(ligne + 1, 2).value = e.name;
  ws.getCell(ligne + 1, colNif).value = "NIF :";
  ws.getCell(ligne + 1, colNif + 1).value = e.nif ?? "-";
  ws.getCell(ligne + 2, 1).value = "Adresse :";
  ws.getCell(ligne + 2, 2).value = e.address ?? "-";
  return ligne + 4;
}

/** En-tête de tableau stylé. */
function enteteTableau(ws: ExcelJS.Worksheet, ligne: number, titres: string[], couleur: string) {
  titres.forEach((t, i) => {
    const c = ws.getCell(ligne, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: couleur } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  return ligne + 1;
}

function lignesTableau(
  ws: ExcelJS.Worksheet, ligne: number,
  lignes: (string | number | null)[][],
  colonnesMontant: number[] = []
) {
  for (const l of lignes) {
    l.forEach((v, i) => {
      const c = ws.getCell(ligne, i + 1);
      c.value = v ?? "-";
      c.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } };
      if (colonnesMontant.includes(i + 1)) c.numFmt = "#,##0";
    });
    ligne++;
  }
  return ligne;
}

function ligneTotaux(ws: ExcelJS.Worksheet, ligne: number, valeurs: (string | number | null)[], colonnesMontant: number[]) {
  valeurs.forEach((v, i) => {
    const c = ws.getCell(ligne, i + 1);
    if (v !== null) c.value = v;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.totaux } };
    c.border = { top: { style: "medium" }, bottom: { style: "medium" } };
    if (colonnesMontant.includes(i + 1)) c.numFmt = "#,##0";
  });
  return ligne + 1;
}

function pied(ws: ExcelJS.Worksheet, ligne: number, auteur: string) {
  const c = ws.getCell(ligne + 1, 1);
  c.value = `Document généré le ${new Date().toLocaleString("fr-FR")} par ${auteur} — Nex'SIRH`;
  c.font = { italic: true, size: 8 };
}

async function buffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const sommes = (l: LignePaie[], f: (x: LignePaie) => number) => l.reduce((s, x) => s + f(x), 0);

// ============================================================
// DÉCLARATION CNSS MENSUELLE (bandeau vert)
// ============================================================
export async function xlsxDeclarationCnss(e: Entreprise, periode: string, lignes: LignePaie[], auteur: string) {
  const { wb, ws } = nouveauClasseur("Déclaration CNSS");
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 15 }, { width: 17 }];
  bandeau(ws, 8, "DÉCLARATION CNSS MENSUELLE", `Période : ${periode}`, COULEURS.vert);
  let l = blocEmployeur(ws, 4, e);
  l = enteteTableau(ws, l, ["N°", "Matricule", "Nom & Prénom", "N° CNSS Salarié", "Salaire Brut (GNF)", "Base CNSS (GNF)", "Part Salarié 5%", "Part Employeur 18%"], COULEURS.vert);
  l = lignesTableau(ws, l, lignes.map((x, i) => [i + 1, x.matricule, x.employee_name, (x as unknown as { cnss_number?: string }).cnss_number ?? "-", x.gross, x.base_cnss, x.cnss_employee, x.cnss_employer]), [5, 6, 7, 8]);
  l = ligneTotaux(ws, l, ["TOTAUX", null, null, null, sommes(lignes, (x) => x.gross), sommes(lignes, (x) => x.base_cnss), sommes(lignes, (x) => x.cnss_employee), sommes(lignes, (x) => x.cnss_employer)], [5, 6, 7, 8]);
  l++;
  ws.getCell(l, 1).value = "TOTAL COTISATIONS À VERSER :";
  ws.getCell(l, 1).font = { bold: true };
  const tot = ws.getCell(l, 8);
  tot.value = sommes(lignes, (x) => x.cnss_employee + x.cnss_employer);
  tot.numFmt = "#,##0";
  tot.font = { bold: true, size: 12, color: { argb: COULEURS.vert } };
  ws.getCell(l + 1, 1).value = `Nombre de salariés déclarés : ${lignes.length}`;
  pied(ws, l + 2, auteur);
  return buffer(wb);
}

// ============================================================
// ÉTAT RTS (bandeau rouge sombre)
// ============================================================
export async function xlsxEtatRts(e: Entreprise, periode: string, lignes: LignePaie[], auteur: string) {
  const { wb, ws } = nouveauClasseur("État RTS");
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 17 }, { width: 18 }, { width: 15 }];
  bandeau(ws, 6, "ÉTAT DE LA RETENUE À LA SOURCE (RTS)", `Direction Nationale des Impôts - Période : ${periode}`, COULEURS.rouge);
  let l = blocEmployeur(ws, 4, e);
  l = enteteTableau(ws, l, ["N°", "Matricule", "Nom & Prénom", "Salaire Brut (GNF)", "Net Imposable (GNF)", "RTS retenue"], COULEURS.rouge);
  l = lignesTableau(ws, l, lignes.map((x, i) => [i + 1, x.matricule, x.employee_name, x.gross, x.taxable_net, x.rts]), [4, 5, 6]);
  l = ligneTotaux(ws, l, ["TOTAUX", null, null, sommes(lignes, (x) => x.gross), sommes(lignes, (x) => x.taxable_net), sommes(lignes, (x) => x.rts)], [4, 5, 6]);
  l++;
  ws.getCell(l, 1).value = "MONTANT RTS À REVERSER À LA DNI :";
  ws.getCell(l, 1).font = { bold: true };
  const tot = ws.getCell(l, 6);
  tot.value = sommes(lignes, (x) => x.rts);
  tot.numFmt = "#,##0";
  tot.font = { bold: true, size: 12, color: { argb: COULEURS.rouge } };
  l += 2;
  ws.getCell(l, 1).value = "RÉCAPITULATIF DÉCLARATION RTS";
  ws.getCell(l, 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getCell(l, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.rouge } };
  const recap: [string, number][] = [
    ["Nombre de salariés", lignes.length],
    ["Montant des traitements bruts", sommes(lignes, (x) => x.gross)],
    ["Montant de la RTS", sommes(lignes, (x) => x.rts)],
  ];
  recap.forEach(([lib, v], i) => {
    ws.getCell(l + 1 + i, 1).value = lib;
    const c = ws.getCell(l + 1 + i, 3);
    c.value = v;
    c.numFmt = "#,##0";
  });
  pied(ws, l + 5, auteur);
  return buffer(wb);
}

// ============================================================
// ÉTAT DES SALAIRES (bandeau or)
// ============================================================
export async function xlsxEtatSalaires(e: Entreprise, periode: string, lignes: LignePaie[], auteur: string) {
  const { wb, ws } = nouveauClasseur("État des salaires");
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 15 }];
  bandeau(ws, 10, `ÉTAT DES SALAIRES - ${e.name.toUpperCase()}`, `Période : ${periode}`, COULEURS.or);
  let l = 4;
  const base = (x: LignePaie) => {
    const gains = (x as unknown as { earnings?: { libelle: string; montant: number }[] }).earnings ?? [];
    return gains.find((g) => g.libelle.toLowerCase().includes("base"))?.montant ?? 0;
  };
  l = enteteTableau(ws, l, ["N°", "Matricule", "Nom & Prénom", "Salaire Base", "Primes & Indemnités", "Brut Total", "CNSS (5%)", "RTS", "Retenues", "Net À Payer"], COULEURS.or);
  l = lignesTableau(ws, l, lignes.map((x, i) => [i + 1, x.matricule, x.employee_name, base(x), x.gross - base(x), x.gross, x.cnss_employee, x.rts, x.loans_deduction + x.other_deductions, x.net_pay]), [4, 5, 6, 7, 8, 9, 10]);
  l = ligneTotaux(ws, l, ["TOTAUX", null, null, sommes(lignes, base), sommes(lignes, (x) => x.gross - base(x)), sommes(lignes, (x) => x.gross), sommes(lignes, (x) => x.cnss_employee), sommes(lignes, (x) => x.rts), sommes(lignes, (x) => x.loans_deduction + x.other_deductions), sommes(lignes, (x) => x.net_pay)], [4, 5, 6, 7, 8, 9, 10]);
  l++;
  ws.getCell(l, 1).value = "MASSE SALARIALE TOTALE (BRUT) :";
  ws.getCell(l, 1).font = { bold: true };
  ws.getCell(l, 10).value = sommes(lignes, (x) => x.gross);
  ws.getCell(l, 10).numFmt = "#,##0";
  ws.getCell(l, 10).font = { bold: true, size: 12 };
  l++;
  ws.getCell(l, 1).value = "TOTAL NET À PAYER :";
  ws.getCell(l, 1).font = { bold: true };
  const net = ws.getCell(l, 10);
  net.value = sommes(lignes, (x) => x.net_pay);
  net.numFmt = "#,##0";
  net.font = { bold: true, size: 12, color: { argb: COULEURS.vert } };
  ws.getCell(l + 1, 1).value = `Nombre de salariés : ${lignes.length}`;
  pied(ws, l + 2, auteur);
  return buffer(wb);
}

// ============================================================
// JOURNAL DE PAIE (bandeau vert)
// ============================================================
export async function xlsxJournalPaie(e: Entreprise, periode: string, lignes: LignePaie[], auteur: string) {
  const { wb, ws } = nouveauClasseur("Journal de paie");
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 15 }, { width: 13 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 15 }];
  bandeau(ws, 9, `JOURNAL DE PAIE - ${e.name.toUpperCase()}`, `Période : ${periode} — document obligatoire (inspection du travail)`, COULEURS.vert);
  let l = 4;
  l = enteteTableau(ws, l, ["N°", "Matricule", "Salarié", "Brut", "CNSS sal.", "RTS", "CNSS pat.", "VF + CFPA", "Net à payer"], COULEURS.vert);
  l = lignesTableau(ws, l, lignes.map((x, i) => [i + 1, x.matricule, x.employee_name, x.gross, x.cnss_employee, x.rts, x.cnss_employer, x.vf + x.cfpa, x.net_pay]), [4, 5, 6, 7, 8, 9]);
  l = ligneTotaux(ws, l, [`TOTAUX (${lignes.length})`, null, null, sommes(lignes, (x) => x.gross), sommes(lignes, (x) => x.cnss_employee), sommes(lignes, (x) => x.rts), sommes(lignes, (x) => x.cnss_employer), sommes(lignes, (x) => x.vf + x.cfpa), sommes(lignes, (x) => x.net_pay)], [4, 5, 6, 7, 8, 9]);
  pied(ws, l + 1, auteur);
  return buffer(wb);
}

// ============================================================
// REGISTRE DU PERSONNEL (bandeau or)
// ============================================================
export async function xlsxRegistrePersonnel(
  e: Entreprise,
  salaries: (Salarie & { brut?: number | null })[],
  auteur: string
) {
  const { wb, ws } = nouveauClasseur("Registre du personnel");
  ws.columns = [
    { width: 7 }, { width: 9 }, { width: 26 }, { width: 12 }, { width: 13 }, { width: 12 },
    { width: 24 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 15 }, { width: 12 }, { width: 12 },
  ];
  bandeau(ws, 16, `REGISTRE DU PERSONNEL - ${e.name.toUpperCase()}`, `Document obligatoire - Inspection du Travail / CNSS - Année ${new Date().getFullYear()}`, COULEURS.or);
  ws.getCell(3, 1).value = "Raison sociale :";
  ws.getCell(3, 2).value = e.name;
  ws.getCell(3, 5).value = "NIF :";
  ws.getCell(3, 6).value = e.nif ?? "-";
  ws.getCell(3, 9).value = "Adresse :";
  ws.getCell(3, 10).value = e.address ?? "-";
  let l = 5;
  l = enteteTableau(ws, l, [
    "N° Ordre", "Statut", "Nom & Prénom", "Date Naissance", "Lieu Naissance", "Nationalité",
    "Adresse", "N° CNI/Passeport", "Poste/Fonction", "Contrat", "Date Embauche", "Date Fin",
    "N° CNSS Salarié", "Salaire Brut (GNF)", "Date Départ", "Motif Départ",
  ], COULEURS.or);
  l = lignesTableau(ws, l, salaries.map((s, i) => [
    i + 1,
    s.status === "actif" ? "Actif" : s.status === "essai" ? "Essai" : s.status === "sorti" ? "Sorti" : s.status,
    `${s.last_name.toUpperCase()} ${s.first_name}`,
    dateFr(s.birth_date), s.birth_place ?? "-", s.nationality ?? "-",
    s.address ?? "-", s.id_doc_number ?? "-", s.poste ?? "-", s.contract_type,
    dateFr(s.hire_date), dateFr(s.contract_end_date), s.cnss_number ?? "-",
    s.brut ?? null, dateFr(s.exit_date), "-",
  ]), [14]);
  pied(ws, l + 1, auteur);
  return buffer(wb);
}

// ============================================================
// SUIVI DES CONGÉS (bandeau sarcelle)
// ============================================================
export async function xlsxSuiviConges(
  e: Entreprise, annee: number,
  lignes: { matricule: string; nom: string; embauche: string; acquis: number; anciennete: number; report: number; pris: number }[],
  auteur: string
) {
  const { wb, ws } = nouveauClasseur("Suivi des congés");
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 28 }, { width: 14 }, { width: 13 }, { width: 12 }, { width: 11 }, { width: 15 }, { width: 12 }, { width: 13 }, { width: 12 }];
  bandeau(ws, 11, `SUIVI DES CONGÉS ANNUELS - ${e.name.toUpperCase()}`, `Année ${annee} - Droit légal : 2,5 jours ouvrables/mois + 1 j par tranche de 5 ans d'ancienneté`, COULEURS.sarcelle);
  let l = 4;
  l = enteteTableau(ws, l, ["N°", "Matricule", "Nom & Prénom", "Date Embauche", "Droits Acquis", "Ancienneté", "Report N-1", "Total Disponible", "Congés Pris", "Solde Restant", "Statut"], COULEURS.sarcelle);
  const donnees = lignes.map((x, i) => {
    const total = x.acquis + x.anciennete + x.report;
    const solde = total - x.pris;
    return [i + 1, x.matricule, x.nom, dateFr(x.embauche), x.acquis, x.anciennete, x.report, total, x.pris, solde, solde > 30 ? "À prendre" : "OK"];
  });
  const debut = l;
  l = lignesTableau(ws, l, donnees, []);
  // Statut coloré
  donnees.forEach((row, i) => {
    const c = ws.getCell(debut + i, 11);
    c.font = { bold: true, color: { argb: row[10] === "OK" ? "FF1E7145" : "FFB8860B" } };
  });
  pied(ws, l + 1, auteur);
  return buffer(wb);
}

// ============================================================
// FICHE INDIVIDUELLE (bandeau or, blocs)
// ============================================================
export async function xlsxFicheIndividuelle(
  e: Entreprise,
  s: Salarie & { comp?: { base_salary: number; seniority_bonus: number; meal_allowance: number; housing_allowance: number; transport_allowance: number; cost_of_living_allowance: number } | null },
  auteur: string
) {
  const { wb, ws } = nouveauClasseur("Fiche individuelle");
  ws.columns = [{ width: 22 }, { width: 26 }, { width: 4 }, { width: 20 }, { width: 22 }];
  bandeau(ws, 5, "FICHE INDIVIDUELLE DU SALARIÉ", e.name, COULEURS.or);

  let l = 4;
  const section = (titre: string) => {
    ws.mergeCells(l, 1, l, 5);
    const c = ws.getCell(l, 1);
    c.value = titre;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.enteteBleu } };
    l++;
  };
  const paire = (l1: string, v1: string | number, l2?: string, v2?: string | number) => {
    ws.getCell(l, 1).value = `${l1} :`;
    ws.getCell(l, 2).value = v1;
    if (l2) {
      ws.getCell(l, 4).value = `${l2} :`;
      ws.getCell(l, 5).value = v2 ?? "-";
    }
    l++;
  };

  section("INFORMATIONS PERSONNELLES");
  paire("Matricule", s.matricule, "Statut", s.status === "actif" ? "Actif" : s.status);
  paire("Nom & Prénom", `${s.civility ?? ""} ${s.first_name} ${s.last_name.toUpperCase()}`.trim());
  paire("Date de naissance", dateFr(s.birth_date), "Lieu", s.birth_place ?? "-");
  paire("Nationalité", s.nationality ?? "-", "Situation", s.marital_status ?? "-");
  paire("Adresse", s.address ?? "-", "Nb enfants", s.children_count ?? 0);
  paire("Téléphone", s.phone ?? "-", "Email", s.email ?? "-");
  paire("N° CNI/Passeport", s.id_doc_number ?? "-", "Expiration", dateFr(s.id_doc_expiry ?? null));
  paire("Contact urgence", [s.emergency_contact_name, s.emergency_contact_phone].filter(Boolean).join(" - ") || "-");
  l++;
  section("INFORMATIONS CONTRACTUELLES");
  paire("Poste / Fonction", s.poste ?? "-", "Catégorie", (s as unknown as { category?: string }).category ?? "Employé");
  paire("Département", s.departement ?? "-");
  paire("Type de contrat", s.contract_type, "Date fin contrat", dateFr(s.contract_end_date));
  const anc = ((Date.now() - new Date(s.hire_date).getTime()) / (365.25 * 86400e3)).toFixed(1);
  paire("Date d'embauche", dateFr(s.hire_date), "Ancienneté", `${anc.replace(".", ",")} an(s)`);
  l++;
  if (s.comp) {
    section("RÉMUNÉRATION");
    const m = (n: number) => `${n.toLocaleString("fr-FR")} GNF`;
    paire("Salaire de base", m(s.comp.base_salary), "Prime de repas", m(s.comp.meal_allowance));
    paire("Prime d'ancienneté", m(s.comp.seniority_bonus), "Indemnité transport", m(s.comp.transport_allowance));
    paire("Indemnité logement", m(s.comp.housing_allowance), "Cherté de vie", m(s.comp.cost_of_living_allowance));
    paire("N° CNSS", s.cnss_number ?? "-");
    paire("Banque", s.bank_name ?? "-", "N° Compte", s.bank_account ?? "-");
    l++;
  }
  section("SIGNATURES");
  ws.getCell(l, 1).value = "Le Gérant";
  ws.getCell(l, 4).value = "Le Salarié (Lu et approuvé)";
  ws.getCell(l, 1).font = { bold: true };
  ws.getCell(l, 4).font = { bold: true };
  l += 2;
  paire("Signature + cachet", "", "Signature", "");
  paire("Date", "_____ / _____ / _____", "Date", "_____ / _____ / _____");
  pied(ws, l + 1, auteur);
  return buffer(wb);
}
