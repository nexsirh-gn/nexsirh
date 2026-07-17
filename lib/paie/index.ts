/**
 * Moteur de paie Nex'SIRH — fonctions PURES (aucun accès UI ni réseau).
 * Règles : CLAUDE.md §6 — chaîne de calcul stricte, barèmes fournis en
 * paramètre (JAMAIS codés en dur : ils viennent de la base via getBaremeAt).
 *
 * Arrondis (§6.8) : calculs exacts portés en décimales tout au long de la
 * chaîne, arrondi final à l'entier GNF (round half up) au moment du stockage.
 */

export interface TrancheRTS {
  lower: number;
  upper: number | null; // null = sans plafond
  rate: number;
}

export interface BaremePaie {
  brackets: TrancheRTS[];
  cnss: { employeeRate: number; employerRate: number; ceiling: number };
  /** VF : assiette = brut − MIN(abatementCap ; rate × brut) — décision du 17/07/2026 */
  vf: { rate: number; abatementCap: number };
  cfpa: { rate: number };
}

export interface ElementsRemuneration {
  baseSalary: number;
  seniorityBonus: number;
  mealAllowance: number;
  housingAllowance: number;
  transportAllowance: number;
  costOfLivingAllowance: number;
  overtime?: number;
  otherBonuses?: number;
}

export interface OptionsBulletin {
  retenues?: number; // avances + prêts + autres retenues
}

export interface BulletinCalcule {
  brut: number;
  baseCnss: number;
  cnssSalariale: number;
  cnssPatronale: number;
  netImposable: number;
  rts: number;
  vfBase: number;
  vf: number;
  cfpa: number;
  retenues: number;
  netAPayer: number;
}

/** Arrondi final à l'entier GNF — round half up (§6.8). */
export const arrondirGNF = (x: number): number => Math.floor(x + 0.5);

/** 1. Total brut */
export function calculBrut(e: ElementsRemuneration): number {
  return (
    e.baseSalary +
    e.seniorityBonus +
    e.mealAllowance +
    e.housingAllowance +
    e.transportAllowance +
    e.costOfLivingAllowance +
    (e.overtime ?? 0) +
    (e.otherBonuses ?? 0)
  );
}

/** 2. Base CNSS = MIN(brut, plafond) */
export function baseCNSS(brut: number, ceiling: number): number {
  return Math.min(brut, ceiling);
}

/** 3-4. Cotisations CNSS (valeurs exactes, non arrondies) */
export function cotisationsCNSS(
  base: number,
  rates: { employeeRate: number; employerRate: number }
): { salariale: number; patronale: number } {
  return { salariale: base * rates.employeeRate, patronale: base * rates.employerRate };
}

/**
 * 5. Net imposable = brut − CNSS salariale − indemnités exonérées.
 * Exclusions confirmées par les 8 bulletins (§6.4) : logement, transport,
 * cherté de vie ET prime de repas. La prime d'ancienneté reste imposable.
 */
export function netImposable(
  brut: number,
  cnssSalariale: number,
  e: ElementsRemuneration
): number {
  return (
    brut -
    cnssSalariale -
    e.housingAllowance -
    e.transportAllowance -
    e.costOfLivingAllowance -
    e.mealAllowance
  );
}

/** 6. RTS — barème progressif appliqué tranche par tranche (valeur arrondie GNF). */
export function calculRTS(ni: number, brackets: TrancheRTS[]): number {
  return arrondirGNF(calculRTSExact(ni, brackets));
}

/** RTS exacte (décimales conservées pour la chaîne de calcul). */
export function calculRTSExact(ni: number, brackets: TrancheRTS[]): number {
  let total = 0;
  for (const t of [...brackets].sort((a, b) => a.lower - b.lower)) {
    if (ni <= t.lower) break;
    const upper = t.upper ?? Infinity;
    total += (Math.min(ni, upper) - t.lower) * t.rate;
  }
  return total;
}

/**
 * 7. Versement Forfaitaire (patronal).
 * Assiette CONFIRMÉE (arbitrage humain du 17/07/2026, vérifiée 0 GNF d'écart
 * sur les 8 bulletins GARAYA) :
 *   assiette_vf = brut − MIN(abatementCap ; rate × brut)
 * Le plafond d'abattement (150 000) et le taux viennent de contribution_rates.
 */
export function calculVF(
  brut: number,
  rate: number,
  abatementCap: number
): { base: number; vf: number } {
  const base = brut - Math.min(abatementCap, brut * rate);
  return { base, vf: base * rate };
}

/**
 * Heures supplémentaires — seule source de vérité (décision du 17/07/2026) :
 * taux horaire = salaire de base / heures mensuelles (173,33), majorations
 * +25 % / +50 % / +100 %, arrondi au GNF UNE SEULE FOIS sur le total final.
 */
export function calculHeuresSup(
  baseSalary: number,
  monthlyHours: number,
  hs: { h25: number; h50: number; h100: number }
): number {
  const tauxHoraire = baseSalary / monthlyHours;
  const total = tauxHoraire * (hs.h25 * 1.25 + hs.h50 * 1.5 + hs.h100 * 2);
  return arrondirGNF(total);
}

/** 8. CFPA (patronal) = brut × taux */
export function calculCFPA(brut: number, rate: number): number {
  return brut * rate;
}

/** 9. Chaîne complète — retourne le bulletin avec arrondis finaux GNF. */
export function calculerBulletin(
  e: ElementsRemuneration,
  bareme: BaremePaie,
  opts: OptionsBulletin = {}
): BulletinCalcule {
  const brut = calculBrut(e);
  const base = baseCNSS(brut, bareme.cnss.ceiling);
  const cnss = cotisationsCNSS(base, bareme.cnss);
  const ni = netImposable(brut, cnss.salariale, e);
  const rtsExact = calculRTSExact(ni, bareme.brackets);
  const { base: vfBase, vf: vfExact } = calculVF(brut, bareme.vf.rate, bareme.vf.abatementCap);
  const cfpaExact = calculCFPA(brut, bareme.cfpa.rate);
  const retenues = opts.retenues ?? 0;

  // Net calculé sur les valeurs EXACTES, arrondi une seule fois (§6.8)
  const netExact = brut - cnss.salariale - rtsExact - retenues;
  const netAPayer = arrondirGNF(netExact);
  if (netAPayer < 0) {
    throw new Error(
      `Retenues (${retenues}) supérieures au net : le net à payer serait négatif. Génération bloquée (§6.7).`
    );
  }

  return {
    brut: arrondirGNF(brut),
    baseCnss: arrondirGNF(base),
    cnssSalariale: arrondirGNF(cnss.salariale),
    cnssPatronale: arrondirGNF(cnss.patronale),
    netImposable: arrondirGNF(ni),
    rts: arrondirGNF(rtsExact),
    vfBase: arrondirGNF(vfBase),
    vf: arrondirGNF(vfExact),
    cfpa: arrondirGNF(cfpaExact),
    retenues,
    netAPayer,
  };
}
