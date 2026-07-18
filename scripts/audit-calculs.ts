/**
 * AUDIT DES CALCULS — recalcule TOUT ce qui est stocké en base avec le moteur
 * lib/paie et compare au franc près :
 *   1. chaque bulletin (brut, base CNSS, CNSS 5/18 %, net imposable, RTS, VF, CFPA, net)
 *   2. la cohérence interne de chaque bulletin (net = brut − cnss − rts − retenues)
 *   3. l'assiette VF stockée vs formule brut − MIN(150 000 ; 6 % × brut)
 *   4. les montants d'heures supplémentaires vs calculHeuresSup
 *   5. les retenues de prêt vs l'échéancier
 *   6. l'arithmétique des soldes de congés
 * Usage : npx tsx scripts/audit-calculs.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { calculerBulletin, calculHeuresSup, calculVF, type BaremePaie } from "../lib/paie";

config({ path: ".env.local" });
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

let ecarts = 0;
let controles = 0;
function verifier(label: string, attendu: number, stocke: number, tolerance = 0) {
  controles++;
  const delta = Math.abs(attendu - stocke);
  if (delta > tolerance) {
    ecarts++;
    console.log(`  ✗ ${label} : moteur=${attendu.toLocaleString("fr-FR")} ≠ base=${stocke.toLocaleString("fr-FR")} (Δ ${delta})`);
  }
}

async function main() {
  // ---------- Barème lu EN BASE (jamais en dur) ----------
  const [{ data: brackets }, { data: rates }] = await Promise.all([
    sb.from("tax_brackets").select("*").order("bracket_order"),
    sb.from("contribution_rates").select("*"),
  ]);
  const cnss = rates!.find((r) => r.code === "cnss")!;
  const vf = rates!.find((r) => r.code === "vf")!;
  const cfpa = rates!.find((r) => r.code === "cfpa")!;
  const bareme: BaremePaie = {
    brackets: brackets!.map((b) => ({ lower: b.lower_bound, upper: b.upper_bound, rate: Number(b.rate) })),
    cnss: { employeeRate: Number(cnss.employee_rate), employerRate: Number(cnss.employer_rate), ceiling: cnss.ceiling },
    vf: { rate: Number(vf.employer_rate), abatementCap: Number(vf.abatement_value) },
    cfpa: { rate: Number(cfpa.employer_rate) },
  };
  console.log(`Barème chargé depuis la base : ${brackets!.length} tranches RTS, VF ${Number(vf.employer_rate) * 100} % (abattement MIN(${Number(vf.abatement_value).toLocaleString("fr-FR")} ; taux × brut))\n`);

  // ---------- 1-3. Bulletins ----------
  const { data: slips } = await sb.from("payslips")
    .select("*, payroll_runs(period_year, period_month)")
    .order("matricule");
  const { data: comps } = await sb.from("employee_compensation").select("*");
  const { data: loans } = await sb.from("loans").select("*").eq("status", "actif");

  console.log(`— 1. Recalcul des ${slips!.length} bulletins stockés —`);
  for (const s of slips!) {
    const run = s.payroll_runs as { period_year: number; period_month: number };
    const comp = comps!.find((c) => c.employee_id === s.employee_id);
    const etiquette = `${s.matricule} ${String(run.period_month).padStart(2, "0")}/${run.period_year}`;
    if (!comp) { console.log(`  ⚠ ${etiquette} : rémunération introuvable`); ecarts++; continue; }

    const pret = loans!.find((l) => l.employee_id === s.employee_id);
    const b = calculerBulletin(
      {
        baseSalary: comp.base_salary, seniorityBonus: comp.seniority_bonus,
        mealAllowance: comp.meal_allowance, housingAllowance: comp.housing_allowance,
        transportAllowance: comp.transport_allowance, costOfLivingAllowance: comp.cost_of_living_allowance,
        otherBonuses: comp.other_bonuses,
      },
      bareme,
      { retenues: pret ? pret.monthly_amount : 0 }
    );
    // Tolérance ±1 GNF uniquement sur les lignes issues d'un demi-franc (§6.8)
    verifier(`${etiquette} brut`, b.brut, s.gross);
    verifier(`${etiquette} base CNSS`, b.baseCnss, s.base_cnss);
    verifier(`${etiquette} CNSS salariale`, b.cnssSalariale, s.cnss_employee);
    verifier(`${etiquette} CNSS patronale`, b.cnssPatronale, s.cnss_employer);
    verifier(`${etiquette} net imposable`, b.netImposable, s.taxable_net);
    verifier(`${etiquette} RTS`, b.rts, s.rts, 1);
    verifier(`${etiquette} assiette VF`, b.vfBase, s.vf_base);
    verifier(`${etiquette} VF`, b.vf, s.vf, 1);
    verifier(`${etiquette} CFPA`, b.cfpa, s.cfpa);
    verifier(`${etiquette} net à payer`, b.netAPayer, s.net_pay, 1);

    // 2. Cohérence interne du bulletin stocké
    verifier(`${etiquette} cohérence net = brut − cnss − rts − retenues`,
      s.gross - s.cnss_employee - s.rts - s.loans_deduction - s.other_deductions, s.net_pay, 1);
    // 3. Assiette VF stockée vs formule confirmée
    const { base } = calculVF(s.gross, bareme.vf.rate, bareme.vf.abatementCap);
    verifier(`${etiquette} VF stockée vs formule`, Math.round(base), s.vf_base);
  }

  // ---------- Totaux par période ----------
  console.log(`\n— Totaux par période —`);
  type Slip = NonNullable<typeof slips>[number];
  const parRun = new Map<string, Slip[]>();
  for (const s of slips!) {
    const run = s.payroll_runs as { period_year: number; period_month: number };
    const k = `${String(run.period_month).padStart(2, "0")}/${run.period_year}`;
    if (!parRun.has(k)) parRun.set(k, []);
    parRun.get(k)!.push(s);
  }
  for (const [periode, liste] of parRun) {
    const t = (f: (x: Slip) => number) => liste.reduce((a, x) => a + f(x), 0);
    console.log(`  ${periode} : ${liste.length} bulletins · brut ${t((x) => x.gross).toLocaleString("fr-FR")} · net ${t((x) => x.net_pay).toLocaleString("fr-FR")} · RTS ${t((x) => x.rts).toLocaleString("fr-FR")} · CNSS ${t((x) => x.cnss_employee + x.cnss_employer).toLocaleString("fr-FR")}`);
  }

  // ---------- 4. Heures supplémentaires ----------
  console.log(`\n— 4. Heures supplémentaires (formule = seule source de vérité) —`);
  const { data: timesheets } = await sb.from("timesheets")
    .select("*, employees(matricule, monthly_hours)")
    .or("overtime_25.gt.0,overtime_50.gt.0,overtime_100.gt.0");
  for (const t of timesheets!) {
    const emp = t.employees as { matricule: string; monthly_hours: number };
    const comp = comps!.find((c) => c.employee_id === t.employee_id)!;
    const attendu = calculHeuresSup(comp.base_salary, Number(emp.monthly_hours), {
      h25: Number(t.overtime_25), h50: Number(t.overtime_50), h100: Number(t.overtime_100),
    });
    verifier(`${emp.matricule} montant HS`, attendu, t.overtime_amount);
  }

  // ---------- 5. Prêts ----------
  console.log(`\n— 5. Retenues de prêt vs échéancier —`);
  for (const l of loans!) {
    const slipsEmp = slips!.filter((s) => s.employee_id === l.employee_id);
    for (const s of slipsEmp) {
      verifier(`prêt ${s.matricule} retenue = mensualité`, l.monthly_amount, s.loans_deduction);
    }
    const reste = l.total_amount - l.installments_paid * l.monthly_amount;
    if (reste < 0) { ecarts++; console.log(`  ✗ prêt ${l.id.slice(0, 8)} : reste négatif`); }
    controles++;
  }

  // ---------- 6. Soldes de congés ----------
  console.log(`\n— 6. Arithmétique des soldes de congés —`);
  const { data: balances } = await sb.from("leave_balances").select("*, employees(matricule, hire_date)");
  const { data: approuves } = await sb.from("leave_requests").select("employee_id, working_days")
    .eq("status", "approuve").eq("leave_type_code", "CA");
  for (const b of balances!) {
    const emp = b.employees as { matricule: string; hire_date: string };
    const dispo = b.entitled_days + b.seniority_bonus_days + b.carryover_days - b.taken_days;
    if (dispo < 0) { ecarts++; console.log(`  ✗ ${emp.matricule} : solde négatif (${dispo})`); }
    controles++;
    // Majoration d'ancienneté : 1 j par tranche de 5 ans (CLAUDE.md §8)
    const annees = Math.floor((Date.now() - new Date(emp.hire_date).getTime()) / (365.25 * 86400e3));
    verifier(`${emp.matricule} majoration ancienneté (${annees} ans)`, Math.floor(annees / 5), b.seniority_bonus_days);
    // Jours pris ≥ somme des CA approuvés de l'année
    const prisApprouves = approuves!.filter((a) => a.employee_id === b.employee_id)
      .reduce((s, a) => s + Number(a.working_days), 0);
    if (b.taken_days < prisApprouves) {
      ecarts++;
      console.log(`  ✗ ${emp.matricule} : jours pris (${b.taken_days}) < congés CA approuvés (${prisApprouves})`);
    }
    controles++;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(ecarts === 0
    ? `✓ AUDIT CONFORME : ${controles} contrôles, 0 écart — tous les calculs sont corrects.`
    : `✗ AUDIT : ${ecarts} écart(s) sur ${controles} contrôles.`);
  process.exit(ecarts === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Échec de l'audit :", e); process.exit(1); });
