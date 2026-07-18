import "server-only";
import { PagePDF, gnf, dateFr, GRIS } from "./commun";

/** Gabarits PDF de tous les documents RH et administratifs. */

export interface Entreprise { name: string; address: string | null; nif: string | null }
export interface Salarie {
  matricule: string; civility: string | null; first_name: string; last_name: string;
  birth_date: string; birth_place: string | null; nationality: string | null;
  cnss_number: string | null; hire_date: string; contract_type: string;
  contract_end_date: string | null; exit_date: string | null; status: string;
  address: string | null; phone: string | null; email: string | null;
  poste: string | null; departement: string | null;
  marital_status?: string | null; children_count?: number | null;
  id_doc_number?: string | null; id_doc_expiry?: string | null;
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null;
  bank_name?: string | null; bank_account?: string | null;
}

const nomComplet = (s: Salarie) => `${s.civility ?? ""} ${s.first_name} ${s.last_name.toUpperCase()}`.trim();
const anciennete = (s: Salarie) =>
  Math.floor((Date.now() - new Date(s.hire_date).getTime()) / (365.25 * 86400e3));

function signature(p: PagePDF, ville = "Conakry") {
  p.y -= 20;
  p.droite(`Fait à ${ville}, le ${dateFr(new Date())}`, p.M + p.L - 40, 10);
  p.y -= 40;
  p.droite("Pour l'employeur (signature et cachet)", p.M + p.L - 40, 9, p.fonte, GRIS);
}

// ============================================================
// LETTRES OFFICIELLES
// ============================================================

export async function attestationTravail(e: Entreprise, s: Salarie): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Attestation de travail" });
  p.y -= 30;
  p.paragraphe(
    `Nous soussignés, ${e.name}${e.address ? `, sise à ${e.address}` : ""}${e.nif ? `, NIF ${e.nif}` : ""}, ` +
    `attestons par la présente que ${nomComplet(s)}, né(e) le ${dateFr(s.birth_date)}` +
    `${s.birth_place ? ` à ${s.birth_place}` : ""}, de nationalité ${s.nationality ?? "guinéenne"}, ` +
    `matricule ${s.matricule}, est employé(e) au sein de notre entreprise depuis le ${dateFr(s.hire_date)} ` +
    `en qualité de ${s.poste ?? "salarié(e)"}${s.departement ? ` au département ${s.departement}` : ""}, ` +
    `dans le cadre d'un contrat ${s.contract_type}.`
  );
  p.y -= 10;
  p.paragraphe(
    "La présente attestation est délivrée à l'intéressé(e) sur sa demande, pour servir et valoir ce que de droit."
  );
  signature(p);
  p.pied();
  return p.sauver();
}

export async function certificatTravail(e: Entreprise, s: Salarie): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Certificat de travail" });
  p.y -= 30;
  const fin = s.exit_date ? dateFr(s.exit_date) : "ce jour";
  p.paragraphe(
    `Nous soussignés, ${e.name}${e.address ? `, sise à ${e.address}` : ""}, certifions que ${nomComplet(s)}, ` +
    `matricule ${s.matricule}, a été employé(e) au sein de notre entreprise du ${dateFr(s.hire_date)} au ${fin}, ` +
    `en qualité de ${s.poste ?? "salarié(e)"}.`
  );
  p.y -= 10;
  p.paragraphe(
    "L'intéressé(e) nous quitte libre de tout engagement. En foi de quoi, nous lui délivrons le présent " +
    "certificat conformément aux dispositions du Code du travail de la République de Guinée, pour servir " +
    "et valoir ce que de droit."
  );
  signature(p);
  p.pied();
  return p.sauver();
}

export async function certificatConge(
  e: Entreprise, s: Salarie,
  conge: { start_date: string; end_date: string; working_days: number; leave_type_code: string }
): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Certificat de congé" });
  p.y -= 30;
  p.paragraphe(
    `Nous soussignés, ${e.name}, certifions que ${nomComplet(s)}, matricule ${s.matricule}, ` +
    `occupant le poste de ${s.poste ?? "salarié(e)"}, bénéficie d'un congé (${conge.leave_type_code}) ` +
    `du ${dateFr(conge.start_date)} au ${dateFr(conge.end_date)} inclus, soit ${conge.working_days} jour(s) ` +
    `ouvrable(s), dûment approuvé selon le circuit de validation en vigueur (Manager puis RH).`
  );
  p.y -= 10;
  p.paragraphe("Ce certificat est délivré pour servir et valoir ce que de droit.");
  signature(p);
  p.pied();
  return p.sauver();
}

export async function soldeToutCompte(
  e: Entreprise, s: Salarie,
  d: {
    motif: string;
    lignes: { libelle: string; detail: string; montant: number }[];
    total: number;
  }
): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Reçu pour solde de tout compte", sousTitre: s.matricule });
  p.y -= 16;
  const MOTIFS: Record<string, string> = {
    demission: "Démission", licenciement: "Licenciement",
    fin_cdd: "Fin de contrat à durée déterminée", retraite: "Départ à la retraite",
  };
  p.champ("Salarié", nomComplet(s), p.M, p.M + 160);
  p.champ("Poste / Catégorie", `${s.poste ?? "—"} (${(s as unknown as { category?: string }).category ?? "Employé"})`, p.M, p.M + 160);
  p.champ("Période d'emploi", `du ${dateFr(s.hire_date)} au ${s.exit_date ? dateFr(s.exit_date) : dateFr(new Date())}`, p.M, p.M + 160);
  p.champ("Ancienneté", `${anciennete(s)} an(s)`, p.M, p.M + 160);
  p.champ("Motif du départ", MOTIFS[d.motif] ?? d.motif, p.M, p.M + 160);
  p.y -= 6;

  p.tableau(
    [
      { titre: "Élément", largeur: 4 },
      { titre: "Feuille de calcul", largeur: 4.5 },
      { titre: "Montant (GNF)", largeur: 2.2, droite: true },
    ],
    d.lignes.map((l) => [l.libelle, l.detail, gnf(l.montant)]),
    { totaux: ["TOTAL À VERSER", "", gnf(d.total)] }
  );
  p.y -= 10;
  p.bandeau("SOLDE DE TOUT COMPTE", `${gnf(d.total)} GNF`);

  p.paragraphe(
    "Calcul établi conformément au Code du travail de la République de Guinée et à la convention collective " +
    "applicable : salaire journalier = brut mensuel / 26 jours ouvrables ; indemnité de licenciement de 25 %, " +
    "30 % puis 35 % du salaire mensuel par année selon la tranche d'ancienneté (1-5, 6-10, 11 ans et plus).",
    8, 11
  );
  p.y -= 8;
  p.paragraphe(
    "Le salarié reconnaît avoir reçu, pour solde de tout compte, la somme détaillée ci-dessus et déclare " +
    "n'avoir plus rien à réclamer au titre de l'exécution et de la rupture de son contrat de travail.",
    8.5, 12
  );
  signature(p);
  p.pied("Signature du salarié précédée de la mention manuscrite « pour solde de tout compte ».");
  return p.sauver();
}

export async function ficheIndividuelle(e: Entreprise, s: Salarie): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Fiche individuelle", sousTitre: s.matricule });
  p.y -= 10;
  const x2 = p.M + 160;
  p.champ("Nom complet", nomComplet(s), p.M, x2);
  p.champ("Naissance", `${dateFr(s.birth_date)}${s.birth_place ? ` à ${s.birth_place}` : ""}`, p.M, x2);
  p.champ("Nationalité", s.nationality ?? "—", p.M, x2);
  p.champ("N° CNSS", s.cnss_number ?? "—", p.M, x2);
  p.champ("Adresse", s.address ?? "—", p.M, x2);
  p.champ("Téléphone / Email", [s.phone, s.email].filter(Boolean).join(" / ") || "—", p.M, x2);
  p.y -= 8;
  p.champ("Poste", s.poste ?? "—", p.M, x2);
  p.champ("Département", s.departement ?? "—", p.M, x2);
  p.champ("Contrat", `${s.contract_type}${s.contract_end_date ? ` (fin : ${dateFr(s.contract_end_date)})` : ""}`, p.M, x2);
  p.champ("Date d'embauche", dateFr(s.hire_date), p.M, x2);
  p.champ("Ancienneté", `${anciennete(s)} an(s)`, p.M, x2);
  p.champ("Statut", s.status, p.M, x2);
  p.pied();
  return p.sauver();
}

// ============================================================
// ÉTATS DE PAIE (par période)
// ============================================================

export interface LignePaie {
  matricule: string; employee_name: string; gross: number; base_cnss: number;
  cnss_employee: number; cnss_employer: number; taxable_net: number; rts: number;
  vf: number; cfpa: number; loans_deduction: number; other_deductions: number; net_pay: number;
}

const somme = (l: LignePaie[], f: (x: LignePaie) => number) => l.reduce((s, x) => s + f(x), 0);

export async function journalPaie(e: Entreprise, periode: string, lignes: LignePaie[]): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Journal de paie", sousTitre: periode });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.4 },
      { titre: "Salarié", largeur: 3.6 },
      { titre: "Brut", largeur: 1.9, droite: true },
      { titre: "CNSS sal.", largeur: 1.7, droite: true },
      { titre: "RTS", largeur: 1.6, droite: true },
      { titre: "CNSS pat.", largeur: 1.7, droite: true },
      { titre: "VF + CFPA", largeur: 1.8, droite: true },
      { titre: "Net à payer", largeur: 2, droite: true },
    ],
    lignes.map((l) => [
      l.matricule, l.employee_name, gnf(l.gross), gnf(l.cnss_employee), gnf(l.rts),
      gnf(l.cnss_employer), gnf(l.vf + l.cfpa), gnf(l.net_pay),
    ]),
    {
      totaux: [
        "", `TOTAUX (${lignes.length} salariés)`, gnf(somme(lignes, (x) => x.gross)),
        gnf(somme(lignes, (x) => x.cnss_employee)), gnf(somme(lignes, (x) => x.rts)),
        gnf(somme(lignes, (x) => x.cnss_employer)), gnf(somme(lignes, (x) => x.vf + x.cfpa)),
        gnf(somme(lignes, (x) => x.net_pay)),
      ],
      taille: 7.5,
    }
  );
  p.y -= 10;
  p.bandeau("NET TOTAL À VIRER", `${gnf(somme(lignes, (x) => x.net_pay))} GNF`);
  p.pied("Document obligatoire — inspection du travail. Une ligne par salarié.");
  return p.sauver();
}

export async function etatRts(e: Entreprise, periode: string, lignes: LignePaie[]): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "État RTS mensuel", sousTitre: `${periode} - format eTax (DNI)` });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.5 },
      { titre: "Salarié", largeur: 4 },
      { titre: "Brut", largeur: 2, droite: true },
      { titre: "Net imposable", largeur: 2.2, droite: true },
      { titre: "RTS retenue", largeur: 2, droite: true },
    ],
    lignes.map((l) => [l.matricule, l.employee_name, gnf(l.gross), gnf(l.taxable_net), gnf(l.rts)]),
    { totaux: ["", `TOTAL (${lignes.length} salariés)`, gnf(somme(lignes, (x) => x.gross)), gnf(somme(lignes, (x) => x.taxable_net)), gnf(somme(lignes, (x) => x.rts))] }
  );
  p.y -= 10;
  p.bandeau("RTS À REVERSER À LA DNI", `${gnf(somme(lignes, (x) => x.rts))} GNF`);
  p.pied("Retenue sur les Traitements et Salaires - barème progressif en vigueur.");
  return p.sauver();
}

export async function declarationCnss(e: Entreprise, periode: string, lignes: LignePaie[]): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Déclaration CNSS mensuelle", sousTitre: periode });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.5 },
      { titre: "Salarié", largeur: 3.5 },
      { titre: "Base CNSS", largeur: 2, droite: true },
      { titre: "Part salariale 5 %", largeur: 2.2, droite: true },
      { titre: "Part patronale 18 %", largeur: 2.4, droite: true },
    ],
    lignes.map((l) => [l.matricule, l.employee_name, gnf(l.base_cnss), gnf(l.cnss_employee), gnf(l.cnss_employer)]),
    { totaux: ["", `TOTAL (${lignes.length} salariés)`, gnf(somme(lignes, (x) => x.base_cnss)), gnf(somme(lignes, (x) => x.cnss_employee)), gnf(somme(lignes, (x) => x.cnss_employer))] }
  );
  p.y -= 10;
  p.bandeau("COTISATIONS À REVERSER À LA CNSS", `${gnf(somme(lignes, (x) => x.cnss_employee + x.cnss_employer))} GNF`);
  p.pied("Brut plafonné selon le taux en vigueur - Caisse Nationale de Sécurité Sociale.");
  return p.sauver();
}

export async function etatSalaires(e: Entreprise, periode: string, lignes: LignePaie[]): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "État des salaires", sousTitre: periode });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.4 },
      { titre: "Salarié", largeur: 3.6 },
      { titre: "Brut", largeur: 2, droite: true },
      { titre: "Cotis. sal.", largeur: 1.9, droite: true },
      { titre: "Retenues", largeur: 1.9, droite: true },
      { titre: "Net à payer", largeur: 2, droite: true },
    ],
    lignes.map((l) => [
      l.matricule, l.employee_name, gnf(l.gross), gnf(l.cnss_employee + l.rts),
      gnf(l.loans_deduction + l.other_deductions), gnf(l.net_pay),
    ]),
    {
      totaux: [
        "", `TOTAUX (${lignes.length} salariés)`, gnf(somme(lignes, (x) => x.gross)),
        gnf(somme(lignes, (x) => x.cnss_employee + x.rts)),
        gnf(somme(lignes, (x) => x.loans_deduction + x.other_deductions)),
        gnf(somme(lignes, (x) => x.net_pay)),
      ],
    }
  );
  p.pied("Récapitulatif de paie mensuel - document interne.");
  return p.sauver();
}

// ============================================================
// REGISTRES (par entreprise / année)
// ============================================================

export async function registrePersonnel(e: Entreprise, salaries: Salarie[]): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Registre du personnel", sousTitre: `${salaries.length} salariés` });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.3 },
      { titre: "Nom et prénom", largeur: 3.4 },
      { titre: "Naissance", largeur: 1.7 },
      { titre: "Nationalité", largeur: 1.7 },
      { titre: "Poste", largeur: 2.3 },
      { titre: "Embauche", largeur: 1.6 },
      { titre: "Contrat", largeur: 1.3 },
      { titre: "Sortie", largeur: 1.5 },
    ],
    salaries.map((s) => [
      s.matricule, `${s.last_name.toUpperCase()} ${s.first_name}`, dateFr(s.birth_date),
      s.nationality ?? "—", s.poste ?? "—", dateFr(s.hire_date), s.contract_type,
      s.exit_date ? dateFr(s.exit_date) : "—",
    ]),
    { taille: 7.5 }
  );
  p.pied("Registre obligatoire - Inspection du Travail / CNSS.");
  return p.sauver();
}

export async function suiviConges(
  e: Entreprise, annee: number,
  lignes: { matricule: string; nom: string; acquis: number; anciennete: number; report: number; pris: number }[]
): Promise<Uint8Array> {
  const p = await PagePDF.creer();
  p.entete({ entreprise: e, titre: "Suivi des congés", sousTitre: `Année ${annee}` });
  p.tableau(
    [
      { titre: "Mat.", largeur: 1.4 },
      { titre: "Salarié", largeur: 3.8 },
      { titre: "Droits acquis", largeur: 1.9, droite: true },
      { titre: "Ancienneté", largeur: 1.7, droite: true },
      { titre: "Report N-1", largeur: 1.6, droite: true },
      { titre: "Pris", largeur: 1.3, droite: true },
      { titre: "Solde", largeur: 1.5, droite: true },
    ],
    lignes.map((l) => [
      l.matricule, l.nom,
      l.acquis.toLocaleString("fr-FR"), l.anciennete.toLocaleString("fr-FR"),
      l.report.toLocaleString("fr-FR"), l.pris.toLocaleString("fr-FR"),
      (l.acquis + l.anciennete + l.report - l.pris).toLocaleString("fr-FR"),
    ])
  );
  p.pied("Congés annuels : 2,5 jours ouvrables par mois travaillé + majoration d'ancienneté.");
  return p.sauver();
}
