/**
 * Tests du calcul de solde de tout compte (étape T).
 * Paramètres par défaut (BAREME_STC_DEFAUT) : base jours ouvrables 26/mois,
 * indemnité de licenciement 25 % / 30 % / 35 % du salaire mensuel par année
 * selon la tranche d'ancienneté (1-5 / 6-10 / 11+), préavis 1 mois (Employé)
 * ou 3 mois (Cadre). Ces valeurs sont des PARAMÈTRES (convention collective),
 * jamais codées en dur dans les appels.
 */
import { describe, it, expect } from "vitest";
import { calculerSoldeToutCompte, BAREME_STC_DEFAUT } from "@/lib/paie/solde";

const base = {
  brutMensuel: 3_745_000, // FAYE
  categorie: "Employé" as const,
  ancienneteAnnees: 10,
  soldeConges: 12.5,
  dateSortie: new Date("2026-07-18"), // 18/31 jours du mois
  bareme: BAREME_STC_DEFAUT,
};

describe("Solde de tout compte — FAYE (licenciement, préavis non effectué)", () => {
  const r = calculerSoltc();
  function calculerSoltc() {
    return calculerSoutien("licenciement", false);
  }
  function calculerSoutien(motif: "licenciement" | "demission" | "fin_cdd" | "retraite", preavisEffectue: boolean) {
    return calculerSoldeToutCompte({ ...base, motif, preavisEffectue });
  }

  it("paie au prorata du mois de sortie (18/31 × 3 745 000 = 2 174 516)", () => {
    const l = r.lignes.find((x) => x.libelle.includes("prorata"))!;
    expect(l.montant).toBe(2_174_516); // 3 745 000 × 18/31 = 2 174 516,13 → arrondi
  });

  it("indemnité compensatrice de congés (12,5 j × 3 745 000/26 = 1 800 481)", () => {
    const l = r.lignes.find((x) => x.libelle.includes("congés"))!;
    expect(l.montant).toBe(1_800_481); // 12,5 × 144 038,46 = 1 800 480,77 → arrondi
  });

  it("indemnité de licenciement 10 ans : 5×25 % + 5×30 % = 2,75 mois = 10 298 750", () => {
    const l = r.lignes.find((x) => x.libelle.includes("licenciement"))!;
    expect(l.montant).toBe(10_298_750);
  });

  it("préavis non effectué (Employé) : 1 mois = 3 745 000", () => {
    const l = r.lignes.find((x) => x.libelle.includes("préavis"))!;
    expect(l.montant).toBe(3_745_000);
  });

  it("total = somme exacte des lignes", () => {
    expect(r.total).toBe(r.lignes.reduce((s, l) => s + l.montant, 0));
    expect(r.total).toBe(2_174_516 + 1_800_481 + 10_298_750 + 3_745_000);
  });
});

describe("Variantes de motif et de catégorie", () => {
  it("démission : ni indemnité de licenciement ni préavis payé", () => {
    const r = calculerSoldeToutCompte({ ...base, motif: "demission", preavisEffectue: true });
    expect(r.lignes.some((l) => l.libelle.includes("licenciement"))).toBe(false);
    expect(r.lignes.some((l) => l.libelle.includes("préavis"))).toBe(false);
  });

  it("licenciement avec préavis effectué : pas d'indemnité de préavis", () => {
    const r = calculerSoldeToutCompte({ ...base, motif: "licenciement", preavisEffectue: true });
    expect(r.lignes.some((l) => l.libelle.includes("préavis"))).toBe(false);
    expect(r.lignes.some((l) => l.libelle.includes("licenciement"))).toBe(true);
  });

  it("cadre : préavis de 3 mois", () => {
    const r = calculerSoldeToutCompte({ ...base, categorie: "Cadre", motif: "licenciement", preavisEffectue: false });
    const l = r.lignes.find((x) => x.libelle.includes("préavis"))!;
    expect(l.montant).toBe(3 * 3_745_000);
  });

  it("ancienneté 15 ans : 5×25 % + 5×30 % + 5×35 % = 4,5 mois", () => {
    const r = calculerSoldeToutCompte({ ...base, ancienneteAnnees: 15, motif: "licenciement", preavisEffectue: true });
    const l = r.lignes.find((x) => x.libelle.includes("licenciement"))!;
    expect(l.montant).toBe(Math.round(4.5 * 3_745_000)); // 16 852 500
  });

  it("ancienneté 3 ans : 3×25 % = 0,75 mois", () => {
    const r = calculerSoldeToutCompte({ ...base, ancienneteAnnees: 3, motif: "licenciement", preavisEffectue: true });
    const l = r.lignes.find((x) => x.libelle.includes("licenciement"))!;
    expect(l.montant).toBe(Math.round(0.75 * 3_745_000)); // 2 808 750
  });

  it("fin de CDD : congés + prorata uniquement (pas de licenciement/préavis)", () => {
    const r = calculerSoldeToutCompte({ ...base, motif: "fin_cdd", preavisEffectue: true });
    expect(r.lignes).toHaveLength(2);
  });

  it("solde de congés nul → pas de ligne congés", () => {
    const r = calculerSoldeToutCompte({ ...base, soldeConges: 0, motif: "demission", preavisEffectue: true });
    expect(r.lignes.some((l) => l.libelle.includes("congés"))).toBe(false);
  });
});
