/**
 * Tests du moteur de paie contre les 8 bulletins GARAYA (CLAUDE.md §7).
 * Conformité au franc près exigée — tolérance ±1 GNF uniquement sur les
 * lignes issues d'un demi-franc (CLAUDE.md §6.8), 0 GNF d'écart ailleurs.
 */
import { describe, it, expect } from "vitest";
import { FIXTURES_GARAYA, BAREME_RTS_V2026_1, COTISATIONS_V2026_1 } from "./garaya.fixtures";
import { calculerBulletin, calculRTS, type BaremePaie } from "@/lib/paie";

const bareme: BaremePaie = {
  brackets: BAREME_RTS_V2026_1,
  cnss: COTISATIONS_V2026_1.cnss,
  vf: { rate: COTISATIONS_V2026_1.vf.rate },
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
        { vfAbatement: f.vfAbatement, retenues: f.entree.retenues }
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
        { vfAbatement: { type: "fixed", value: 150_000 }, retenues: 5_000_000 }
      )
    ).toThrow(/négatif/);
  });
});
