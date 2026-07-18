/**
 * Solde de tout compte (étape T) — fonctions PURES.
 *
 * Le barème (base jours ouvrables, tranches d'indemnité de licenciement,
 * durées de préavis) est un PARAMÈTRE : les valeurs par défaut ci-dessous
 * correspondent à la pratique usuelle de la Convention Collective guinéenne
 * et restent ajustables sans toucher au calcul.
 */
import { arrondirGNF } from "./index";

export interface BaremeSTC {
  /** Jours ouvrables par mois pour le salaire journalier (défaut : 26). */
  joursOuvrablesMois: number;
  /** Tranches d'indemnité de licenciement : % du salaire mensuel par année. */
  tranchesLicenciement: { jusquA: number | null; tauxParAnnee: number }[];
  /** Durée de préavis (en mois) par catégorie. */
  preavisMois: Record<string, number>;
}

export const BAREME_STC_DEFAUT: BaremeSTC = {
  joursOuvrablesMois: 26,
  tranchesLicenciement: [
    { jusquA: 5, tauxParAnnee: 0.25 },   // années 1 à 5 : 25 %
    { jusquA: 10, tauxParAnnee: 0.30 },  // années 6 à 10 : 30 %
    { jusquA: null, tauxParAnnee: 0.35 }, // au-delà : 35 %
  ],
  preavisMois: { "Employé": 1, "Cadre": 3, "Cadre Supérieur": 3 },
};

export type MotifDepart = "demission" | "licenciement" | "fin_cdd" | "retraite";

export interface ParamsSTC {
  brutMensuel: number;
  categorie: string;
  ancienneteAnnees: number;   // années complètes
  soldeConges: number;        // jours ouvrables restants
  dateSortie: Date;
  motif: MotifDepart;
  preavisEffectue: boolean;
  bareme: BaremeSTC;
}

export interface LigneSTC {
  libelle: string;
  detail: string;
  montant: number;
}

export interface ResultatSTC {
  lignes: LigneSTC[];
  total: number;
}

/** Mois d'indemnité de licenciement selon l'ancienneté (tranche par tranche). */
export function moisIndemniteLicenciement(annees: number, bareme: BaremeSTC): number {
  let mois = 0;
  let deja = 0;
  for (const t of bareme.tranchesLicenciement) {
    const plafond = t.jusquA ?? Infinity;
    const dansTranche = Math.max(0, Math.min(annees, plafond) - deja);
    mois += dansTranche * t.tauxParAnnee;
    deja = plafond;
    if (annees <= plafond) break;
  }
  return mois;
}

export function calculerSoldeToutCompte(p: ParamsSTC): ResultatSTC {
  const lignes: LigneSTC[] = [];
  const jourOuvrable = p.brutMensuel / p.bareme.joursOuvrablesMois;

  // 1. Paie du mois de sortie au prorata (jours calendaires écoulés)
  const jourSortie = p.dateSortie.getDate();
  const joursDuMois = new Date(p.dateSortie.getFullYear(), p.dateSortie.getMonth() + 1, 0).getDate();
  lignes.push({
    libelle: "Salaire du mois de sortie au prorata",
    detail: `${jourSortie}/${joursDuMois} jours × ${Math.round(p.brutMensuel).toLocaleString("fr-FR")} GNF`,
    montant: arrondirGNF(p.brutMensuel * (jourSortie / joursDuMois)),
  });

  // 2. Indemnité compensatrice de congés non pris
  if (p.soldeConges > 0) {
    lignes.push({
      libelle: "Indemnité compensatrice de congés non pris",
      detail: `${p.soldeConges.toLocaleString("fr-FR")} j ouvrables × brut/${p.bareme.joursOuvrablesMois}`,
      montant: arrondirGNF(p.soldeConges * jourOuvrable),
    });
  }

  // 3. Indemnité de licenciement (hors démission / fin CDD / retraite)
  if (p.motif === "licenciement") {
    const mois = moisIndemniteLicenciement(p.ancienneteAnnees, p.bareme);
    if (mois > 0) {
      lignes.push({
        libelle: "Indemnité de licenciement",
        detail: `${p.ancienneteAnnees} an(s) d'ancienneté = ${mois.toLocaleString("fr-FR")} mois de salaire`,
        montant: arrondirGNF(mois * p.brutMensuel),
      });
    }
    // 4. Indemnité compensatrice de préavis (si non effectué)
    if (!p.preavisEffectue) {
      const moisPreavis = p.bareme.preavisMois[p.categorie] ?? 1;
      lignes.push({
        libelle: "Indemnité compensatrice de préavis",
        detail: `${moisPreavis} mois (${p.categorie})`,
        montant: arrondirGNF(moisPreavis * p.brutMensuel),
      });
    }
  }

  return { lignes, total: lignes.reduce((s, l) => s + l.montant, 0) };
}
