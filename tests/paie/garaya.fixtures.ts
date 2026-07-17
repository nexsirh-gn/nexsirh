/**
 * FIXTURES GARAYA — VÉRITÉ ABSOLUE (CLAUDE.md §7)
 * Période décembre 2025. Tout moteur de paie DOIT reproduire ces montants.
 * ⛔ INTERDICTION ABSOLUE de modifier ce tableau pour « faire passer » un test.
 *
 * Assiette VF — CONFIRMÉE par arbitrage humain le 17/07/2026 :
 *   assiette_vf = brut − MIN(150 000 GNF ; 6 % × brut)
 * Formule unique pour tous les salariés, vérifiée 0 GNF d'écart sur les
 * 8 bulletins (SYLLA et CAMARA tombent simplement sous le plafond de 150 000).
 */

export interface FixtureGaraya {
  matricule: string;
  nom: string;
  entree: {
    baseSalary: number;
    seniorityBonus: number;
    mealAllowance: number;
    housingAllowance: number;
    transportAllowance: number;
    costOfLivingAllowance: number;
    retenues: number; // avances / prêts
  };
  attendu: {
    brut: number;
    baseCnss: number;
    cnssSalariale: number;
    cnssPatronale: number;
    netImposable: number;
    rts: number;
    vf: number;
    cfpa: number;
    netAPayer: number;
  };
  /** true si une ligne du bulletin source contient un demi-franc → tolérance ±1 GNF */
  demiFranc: boolean;
}

export const FIXTURES_GARAYA: FixtureGaraya[] = [
  {
    matricule: "EMP-002",
    nom: "FAYE Aboubacar",
    entree: { baseSalary: 3_000_000, seniorityBonus: 120_000, mealAllowance: 150_000, housingAllowance: 150_000, transportAllowance: 225_000, costOfLivingAllowance: 100_000, retenues: 2_016_982 },
    attendu: { brut: 3_745_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 2_995_000, rts: 99_750, vf: 215_700, cfpa: 56_175, netAPayer: 1_503_268 },
    demiFranc: false,
  },
  {
    matricule: "EMP-004",
    nom: "TOLNO Michel",
    entree: { baseSalary: 2_500_000, seniorityBonus: 245_000, mealAllowance: 160_000, housingAllowance: 150_000, transportAllowance: 160_000, costOfLivingAllowance: 140_000, retenues: 0 },
    attendu: { brut: 3_355_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 2_620_000, rts: 81_000, vf: 192_300, cfpa: 50_325, netAPayer: 3_149_000 },
    demiFranc: false,
  },
  {
    matricule: "EMP-005",
    nom: "TRAORE Aminata",
    entree: { baseSalary: 2_000_000, seniorityBonus: 135_000, mealAllowance: 150_000, housingAllowance: 250_000, transportAllowance: 120_000, costOfLivingAllowance: 90_000, retenues: 0 },
    attendu: { brut: 2_745_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 2_010_000, rts: 50_500, vf: 155_700, cfpa: 41_175, netAPayer: 2_569_500 },
    demiFranc: false,
  },
  {
    matricule: "EMP-006",
    nom: "SYLLA Aboubacar",
    entree: { baseSalary: 1_500_000, seniorityBonus: 200_000, mealAllowance: 100_000, housingAllowance: 150_000, transportAllowance: 150_000, costOfLivingAllowance: 115_000, retenues: 0 },
    attendu: { brut: 2_215_000, baseCnss: 2_215_000, cnssSalariale: 110_750, cnssPatronale: 398_700, netImposable: 1_589_250, rts: 29_463, vf: 124_926, cfpa: 33_225, netAPayer: 2_074_788 },
    demiFranc: true, // RTS source : 29 462,5
  },
  {
    matricule: "EMP-007",
    nom: "CAMARA Bountouraby",
    entree: { baseSalary: 1_600_000, seniorityBonus: 235_000, mealAllowance: 150_000, housingAllowance: 150_000, transportAllowance: 134_000, costOfLivingAllowance: 120_000, retenues: 0 },
    attendu: { brut: 2_389_000, baseCnss: 2_389_000, cnssSalariale: 119_450, cnssPatronale: 430_020, netImposable: 1_715_550, rts: 35_778, vf: 134_740, cfpa: 35_835, netAPayer: 2_233_773 },
    demiFranc: true, // RTS source : 35 777,5
  },
  {
    matricule: "EMP-008",
    nom: "BARRY Moussa",
    entree: { baseSalary: 1_800_000, seniorityBonus: 235_000, mealAllowance: 150_000, housingAllowance: 150_000, transportAllowance: 134_000, costOfLivingAllowance: 120_000, retenues: 0 },
    attendu: { brut: 2_589_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 1_910_000, rts: 45_500, vf: 146_340, cfpa: 38_835, netAPayer: 2_418_500 },
    demiFranc: false,
  },
  {
    matricule: "EMP-009",
    nom: "PLEGNEMOU Gassim",
    entree: { baseSalary: 3_500_000, seniorityBonus: 210_000, mealAllowance: 165_000, housingAllowance: 250_000, transportAllowance: 215_000, costOfLivingAllowance: 140_000, retenues: 0 },
    attendu: { brut: 4_480_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 3_585_000, rts: 146_800, vf: 259_800, cfpa: 67_200, netAPayer: 4_208_200 },
    demiFranc: false,
  },
  {
    matricule: "EMP-010",
    nom: "CONTE Ousmane",
    entree: { baseSalary: 2_000_000, seniorityBonus: 146_000, mealAllowance: 150_000, housingAllowance: 150_000, transportAllowance: 130_000, costOfLivingAllowance: 80_000, retenues: 0 },
    attendu: { brut: 2_656_000, baseCnss: 2_500_000, cnssSalariale: 125_000, cnssPatronale: 450_000, netImposable: 2_021_000, rts: 51_050, vf: 150_360, cfpa: 39_840, netAPayer: 2_479_950 },
    demiFranc: false,
  },
];

/** Barème RTS v2026.1 — tranches sur le net imposable, tranche 0 incluse (CLAUDE.md §6.3) */
export const BAREME_RTS_V2026_1 = [
  { lower: 0, upper: 1_000_000, rate: 0 },
  { lower: 1_000_000, upper: 3_000_000, rate: 0.05 },
  { lower: 3_000_000, upper: 6_000_000, rate: 0.08 },
  { lower: 6_000_000, upper: 11_000_000, rate: 0.1 },
  { lower: 11_000_000, upper: null, rate: 0.15 },
];

/** Cotisations v2026.1 (CLAUDE.md §6.2) */
export const COTISATIONS_V2026_1 = {
  cnss: { employeeRate: 0.05, employerRate: 0.18, ceiling: 2_500_000 },
  vf: { rate: 0.06, abatementCap: 150_000 },
  cfpa: { rate: 0.015 },
};
