/**
 * Tests du moteur de paie contre les 8 bulletins GARAYA (CLAUDE.md §7).
 * Conformité au franc près exigée — tolérance ±1 GNF uniquement sur les
 * lignes issues d'un demi-franc (CLAUDE.md §6.8), 0 GNF d'écart ailleurs.
 */
import { describe, it, expect } from "vitest";
import { FIXTURES_GARAYA, BAREME_RTS_V2026_1, COTISATIONS_V2026_1 } from "./garaya.fixtures";
import { calculerBulletin, calculRTS, calculVF, calculHeuresSup, type BaremePaie } from "@/lib/paie";

const bareme: BaremePaie = {
  brackets: BAREME_RTS_V2026_1,
  cnss: COTISATIONS_V2026_1.cnss,
  vf: COTISATIONS_V2026_1.vf,
  cfpa: COTISATIONS_V2026_1.cfpa,
};

describe("Moteur de paie — fixtures GARAYA (8 bulletins, franc près)", () => {
  for (const f of FIXTURES_GARAYA) {
    describe(`${f.matricule} ${f.nom}`, () => {
      const b = calculerBulletin(
        {
          baseSalary: f.entree.baseSalary,
          seniorityBonus: f.entree.seniorityBonus,
          mealAllowance: f.entree.mealAllowance,
          housingAllowance: f.entree.housingAllowance,
          transportAllowance: f.entree.transportAllowance,
          costOfLivingAllowance: f.entree.costOfLivingAllowance,
        },
        bareme,
        { retenues: f.entree.retenues }
      );
      const tol = f.demiFranc ? 1 : 0;

      it("total brut", () => expect(b.brut).toBe(f.attendu.brut));
      it("base CNSS (plafond 2 500 000)", () => expect(b.baseCnss).toBe(f.attendu.baseCnss));
      it("CNSS salariale 5 %", () => expect(b.cnssSalariale).toBe(f.attendu.cnssSalariale));
      it("CNSS patronale 18 %", () => expect(b.cnssPatronale).toBe(f.attendu.cnssPatronale));
      it("net imposable (indemnités + repas exclus)", () =>
        expect(b.netImposable).toBe(f.attendu.netImposable));
      it("RTS tranche par tranche", () =>
        expect(Math.abs(b.rts - f.attendu.rts)).toBeLessThanOrEqual(tol));
      it("VF patronal 6 %", () =>
        expect(Math.abs(b.vf - f.attendu.vf)).toBeLessThanOrEqual(tol));
      it("CFPA patronal 1,5 %", () => expect(b.cfpa).toBe(f.attendu.cfpa));
      it("net à payer", () =>
        expect(Math.abs(b.netAPayer - f.attendu.netAPayer)).toBeLessThanOrEqual(tol));
    });
  }
});

describe("Cas limites", () => {
  it("PLEGNEMOU : franchissement de tranche (0 % + 5 % + 8 %)", () => {
    // 3 585 000 → 0 % sur 1 M, 5 % sur 2 M (=100 000), 8 % sur 585 000 (=46 800)
    expect(calculRTS(3_585_000, BAREME_RTS_V2026_1)).toBe(146_800);
  });
  it("net imposable nul → RTS 0", () => {
    expect(calculRTS(0, BAREME_RTS_V2026_1)).toBe(0);
  });
  it("net imposable sous 1 M → RTS 0 (tranche à 0 %)", () => {
    expect(calculRTS(999_999, BAREME_RTS_V2026_1)).toBe(0);
  });
  it("tranche supérieure 15 % au-delà de 11 M", () => {
    // 12 M → 0 + 100 000 + 240 000 + 500 000 + 150 000 = 990 000
    expect(calculRTS(12_000_000, BAREME_RTS_V2026_1)).toBe(990_000);
  });
  it("une retenue ne peut pas rendre le net négatif (erreur bloquante §6.7)", () => {
    expect(() =>
      calculerBulletin(
        { baseSalary: 1_000_000, seniorityBonus: 0, mealAllowance: 0, housingAllowance: 0, transportAllowance: 0, costOfLivingAllowance: 0 },
        bareme,
        { retenues: 5_000_000 }
      )
    ).toThrow(/négatif/);
  });
});

describe("Assiette VF — formule unique brut − MIN(150 000 ; 6 % × brut) (décision 17/07/2026)", () => {
  it("sous le seuil (SYLLA : 6 % × 2 215 000 = 132 900 < 150 000)", () => {
    const { base } = calculVF(2_215_000, 0.06, 150_000);
    expect(base).toBe(2_082_100);
  });
  it("sous le seuil (CAMARA : 6 % × 2 389 000 = 143 340 < 150 000)", () => {
    const { base } = calculVF(2_389_000, 0.06, 150_000);
    expect(base).toBe(2_245_660);
  });
  it("au-dessus du seuil (FAYE : 6 % × 3 745 000 = 224 700 → plafonné à 150 000)", () => {
    const { base } = calculVF(3_745_000, 0.06, 150_000);
    expect(base).toBe(3_595_000);
  });
  it("point de bascule exact (brut = 2 500 000 → 6 % = 150 000 pile)", () => {
    const { base } = calculVF(2_500_000, 0.06, 150_000);
    expect(base).toBe(2_350_000);
  });
});

describe("Heures supplémentaires — formule seule source de vérité (décision 17/07/2026)", () => {
  it("CONTE : base 2 000 000, 8 h +25 % / 4 h +50 % / 3 h +100 % → 253 851 GNF", () => {
    // taux horaire = 2 000 000 / 173,33 ; total = th × (8×1,25 + 4×1,5 + 3×2) = th × 22
    // = 253 851,03 → arrondi UNE SEULE FOIS sur le total final
    expect(calculHeuresSup(2_000_000, 173.33, { h25: 8, h50: 4, h100: 3 })).toBe(253_851);
  });
  it("SYLLA : base 1 500 000, 8 h +25 % → 86 540 GNF", () => {
    // 1 500 000 / 173,33 × 10 = 86 540,13 → 86 540
    expect(calculHeuresSup(1_500_000, 173.33, { h25: 8, h50: 0, h100: 0 })).toBe(86_540);
  });
  it("aucune heure sup → 0", () => {
    expect(calculHeuresSup(2_000_000, 173.33, { h25: 0, h50: 0, h100: 0 })).toBe(0);
  });
});
