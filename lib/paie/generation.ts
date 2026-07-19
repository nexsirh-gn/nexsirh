import type { SupabaseClient } from "@supabase/supabase-js";
import { calculerBulletin, type BaremePaie } from "./index";
// NB : pas de "server-only" ici — module pur (le client Supabase est fourni
// par l'appelant : Server Action avec session, ou script de test avec RLS).

/**
 * Génération / recalcul des bulletins d'une période (étape N).
 * Les barèmes sont TOUJOURS lus en base via getBaremeAt (jamais en dur),
 * les saisies manuelles (rappels, retenues) survivent au recalcul,
 * les heures supplémentaires VALIDÉES de la période sont injectées.
 */

export interface LigneManuelle { libelle: string; montant: number }

/** Barème applicable à une date donnée (versions par date d'effet, CLAUDE §6.1). */
export async function getBaremeAt(sb: SupabaseClient, date: string): Promise<BaremePaie> {
  const [{ data: brackets }, { data: rates }] = await Promise.all([
    sb.from("tax_brackets").select("*")
      .lte("effective_from", date)
      .or(`effective_to.is.null,effective_to.gte.${date}`)
      .order("effective_from", { ascending: false })
      .order("bracket_order"),
    sb.from("contribution_rates").select("*")
      .lte("effective_from", date)
      .or(`effective_to.is.null,effective_to.gte.${date}`)
      .order("effective_from", { ascending: false }),
  ]);
  if (!brackets?.length || !rates?.length) {
    throw new Error(`Aucun barème en vigueur au ${date} — vérifiez tax_brackets / contribution_rates.`);
  }
  // Ne garder que la version la plus récente applicable
  const versionRts = brackets[0].version_ref;
  const tranches = brackets.filter((b) => b.version_ref === versionRts);
  const taux = (code: string) => {
    const r = rates.find((x) => x.code === code);
    if (!r) throw new Error(`Cotisation « ${code} » absente du barème au ${date}.`);
    return r;
  };
  const cnss = taux("cnss");
  const vf = taux("vf");
  const cfpa = taux("cfpa");
  return {
    brackets: tranches.map((b) => ({ lower: b.lower_bound, upper: b.upper_bound, rate: Number(b.rate) })),
    cnss: { employeeRate: Number(cnss.employee_rate), employerRate: Number(cnss.employer_rate), ceiling: cnss.ceiling },
    vf: { rate: Number(vf.employer_rate), abatementCap: Number(vf.abatement_value) },
    cfpa: { rate: Number(cfpa.employer_rate) },
  };
}

export interface BulletinCalculePeriode {
  employee_id: string;
  employee_name: string;
  matricule: string;
  position_title: string | null;
  gross: number; base_cnss: number; cnss_employee: number; cnss_employer: number;
  taxable_net: number; rts: number; vf_base: number; vf: number; cfpa: number;
  loans_deduction: number; other_deductions: number; net_pay: number;
  earnings: LigneManuelle[];
  deductions: LigneManuelle[];
  manual_bonuses: LigneManuelle[];
}

const somme = (l: LigneManuelle[]) => l.reduce((s, x) => s + Number(x.montant || 0), 0);

/**
 * Calcule les bulletins de tous les salariés éligibles d'une période.
 * `manuels` : saisies existantes à conserver (recalcul), indexées par employee_id.
 */
export async function calculerBulletinsPeriode(
  sb: SupabaseClient,
  companyId: string,
  year: number,
  month: number,
  manuels: Map<string, { deductions: LigneManuelle[]; manual_bonuses: LigneManuelle[] }> = new Map()
): Promise<BulletinCalculePeriode[]> {
  const debutMois = `${year}-${String(month).padStart(2, "0")}-01`;
  const finMois = new Date(year, month, 0).toISOString().slice(0, 10);
  const bareme = await getBaremeAt(sb, finMois);

  const [{ data: emps }, { data: comps }, { data: loans }, { data: timesheets }] = await Promise.all([
    sb.from("employees")
      .select("id, matricule, first_name, last_name, status, hire_date, exit_date, positions(title)")
      .eq("company_id", companyId).order("matricule"),
    sb.from("employee_compensation").select("*").eq("company_id", companyId),
    sb.from("loans").select("employee_id, monthly_amount").eq("company_id", companyId).eq("status", "actif"),
    // Heures sup : uniquement les feuilles VALIDÉES (ou déjà transmises) de la période
    sb.from("timesheets").select("employee_id, overtime_amount, status")
      .eq("company_id", companyId).eq("period_year", year).eq("period_month", month)
      .in("status", ["valide", "transmis_paie"]),
  ]);

  // Éligibles : embauchés avant la fin du mois, pas sortis avant le début, pas suspendus
  const eligibles = (emps ?? []).filter((e) =>
    e.hire_date <= finMois &&
    (!e.exit_date || e.exit_date >= debutMois) &&
    e.status !== "suspendu"
  );

  const bulletins: BulletinCalculePeriode[] = [];
  for (const e of eligibles) {
    const c = (comps ?? []).find((x) => x.employee_id === e.id);
    if (!c) continue; // pas de rémunération définie → pas de bulletin (signalé côté action)
    const pret = (loans ?? []).find((l) => l.employee_id === e.id);
    const hs = (timesheets ?? []).find((t) => t.employee_id === e.id)?.overtime_amount ?? 0;
    const manuel = manuels.get(e.id) ?? { deductions: [], manual_bonuses: [] };
    const rappels = somme(manuel.manual_bonuses);
    const retenuesManuelles = somme(manuel.deductions);
    const retenues = (pret?.monthly_amount ?? 0) + retenuesManuelles;

    const b = calculerBulletin(
      {
        baseSalary: c.base_salary, seniorityBonus: c.seniority_bonus,
        mealAllowance: c.meal_allowance, housingAllowance: c.housing_allowance,
        transportAllowance: c.transport_allowance, costOfLivingAllowance: c.cost_of_living_allowance,
        overtime: hs,
        otherBonuses: c.other_bonuses + rappels, // rappels = gains imposables et soumis CNSS
      },
      bareme,
      { retenues }
    );

    const earnings: LigneManuelle[] = [
      { libelle: "Salaire de base", montant: c.base_salary },
      { libelle: "Prime d'ancienneté", montant: c.seniority_bonus },
      { libelle: "Prime de repas", montant: c.meal_allowance },
      { libelle: "Indemnité de logement", montant: c.housing_allowance },
      { libelle: "Indemnité de transport", montant: c.transport_allowance },
      { libelle: "Indemnité de cherté de vie", montant: c.cost_of_living_allowance },
      ...(c.other_bonuses > 0 ? [{ libelle: "Autres primes", montant: c.other_bonuses }] : []),
      ...(hs > 0 ? [{ libelle: "Heures supplémentaires", montant: hs }] : []),
      ...manuel.manual_bonuses.map((m) => ({ libelle: `Rappel — ${m.libelle}`, montant: m.montant })),
    ].filter((l) => l.montant > 0);

    bulletins.push({
      employee_id: e.id,
      employee_name: `${e.last_name} ${e.first_name}`,
      matricule: e.matricule,
      position_title: (e.positions as unknown as { title: string } | null)?.title ?? null,
      gross: b.brut, base_cnss: b.baseCnss, cnss_employee: b.cnssSalariale,
      cnss_employer: b.cnssPatronale, taxable_net: b.netImposable, rts: b.rts,
      vf_base: b.vfBase, vf: b.vf, cfpa: b.cfpa,
      loans_deduction: pret?.monthly_amount ?? 0,
      other_deductions: retenuesManuelles,
      net_pay: b.netAPayer,
      earnings,
      deductions: manuel.deductions,
      manual_bonuses: manuel.manual_bonuses,
    });
  }
  return bulletins;
}

// ============================================================
// ORCHESTRATION (utilisée par les Server Actions ET les tests E2E,
// toujours avec un client soumis à la RLS)
// ============================================================

export async function genererPaieDB(
  sb: SupabaseClient, companyId: string, userId: string, year: number, month: number
): Promise<number> {
  const { data: existant } = await sb.from("payroll_runs").select("id")
    .eq("period_year", year).eq("period_month", month).maybeSingle();
  if (existant) throw new Error("Cette période existe déjà — utilisez « Recalculer ».");

  const bulletins = await calculerBulletinsPeriode(sb, companyId, year, month);
  if (bulletins.length === 0) throw new Error("Aucun salarié éligible avec une rémunération définie.");

  const { data: run, error: eRun } = await sb.from("payroll_runs").insert({
    company_id: companyId, period_year: year, period_month: month,
    status: "brouillon", generated_at: new Date().toISOString(), generated_by: userId,
    bareme_version: "getBaremeAt",
  }).select("id").single();
  if (eRun) throw new Error(eRun.message);

  const { error: eSlips } = await sb.from("payslips").insert(
    bulletins.map((b) => ({ ...b, company_id: companyId, payroll_run_id: run.id }))
  );
  if (eSlips) {
    await sb.from("payroll_runs").delete().eq("id", run.id);
    throw new Error(eSlips.message);
  }
  await sb.from("timesheets").update({ status: "transmis_paie" })
    .eq("period_year", year).eq("period_month", month).eq("status", "valide");
  return bulletins.length;
}

export async function recalculerPaieDB(sb: SupabaseClient, companyId: string, runId: string): Promise<number> {
  const { data: run } = await sb.from("payroll_runs")
    .select("id, period_year, period_month, status").eq("id", runId).maybeSingle();
  if (!run) throw new Error("Période introuvable.");
  if (run.status === "cloture") throw new Error("Période clôturée : passez par un rappel/reprise sur le mois suivant.");

  const { data: existants } = await sb.from("payslips")
    .select("employee_id, deductions, manual_bonuses").eq("payroll_run_id", runId);
  const manuels = new Map(
    (existants ?? []).map((s) => [s.employee_id as string, {
      deductions: (s.deductions ?? []) as LigneManuelle[],
      manual_bonuses: (s.manual_bonuses ?? []) as LigneManuelle[],
    }])
  );

  const bulletins = await calculerBulletinsPeriode(sb, companyId, run.period_year, run.period_month, manuels);

  const { error: eDel } = await sb.from("payslips").delete().eq("payroll_run_id", runId);
  if (eDel) throw new Error(eDel.message);
  const { error: eIns } = await sb.from("payslips").insert(
    bulletins.map((b) => ({ ...b, company_id: companyId, payroll_run_id: runId }))
  );
  if (eIns) throw new Error(eIns.message);

  await sb.from("timesheets").update({ status: "transmis_paie" })
    .eq("period_year", run.period_year).eq("period_month", run.period_month).eq("status", "valide");
  return bulletins.length;
}

export async function ajouterAjustementDB(
  sb: SupabaseClient, companyId: string, payslipId: string,
  type: "retenue" | "rappel", libelle: string, montant: number
): Promise<void> {
  if (!libelle.trim() || !Number.isFinite(montant) || montant <= 0) {
    throw new Error("Libellé et montant (entier positif, GNF) obligatoires.");
  }
  const { data: slip } = await sb.from("payslips")
    .select("id, employee_id, deductions, manual_bonuses, payroll_runs(period_year, period_month, status)")
    .eq("id", payslipId).maybeSingle();
  if (!slip) throw new Error("Bulletin introuvable.");
  const run = slip.payroll_runs as unknown as { period_year: number; period_month: number; status: string };
  if (run.status === "cloture") throw new Error("Bulletin clôturé : régularisation sur le mois suivant uniquement.");

  const manuels = new Map([[slip.employee_id as string, {
    deductions: [
      ...((slip.deductions ?? []) as LigneManuelle[]),
      ...(type === "retenue" ? [{ libelle, montant: Math.round(montant) }] : []),
    ],
    manual_bonuses: [
      ...((slip.manual_bonuses ?? []) as LigneManuelle[]),
      ...(type === "rappel" ? [{ libelle, montant: Math.round(montant) }] : []),
    ],
  }]]);

  const bulletins = await calculerBulletinsPeriode(sb, companyId, run.period_year, run.period_month, manuels);
  const b = bulletins.find((x) => x.employee_id === slip.employee_id);
  if (!b) throw new Error("Salarié non éligible sur cette période.");

  const { employee_id: _e, ...maj } = b;
  void _e;
  const { error } = await sb.from("payslips").update(maj).eq("id", payslipId);
  if (error) throw new Error(error.message);
}
