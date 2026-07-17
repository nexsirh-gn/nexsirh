/**
 * SEED Nex'SIRH — recrée l'univers des maquettes avec de VRAIES données :
 *   - GARAYA HOLDING (Business, active) + les 8 salariés des fixtures GARAYA
 *   - INJELEC-GUINÉE (Business, impayée), SOGUIPAH SARL (essai)
 *   - Barème RTS v2026.1, cotisations, jours fériés 2026, référentiels
 *   - Paie juin 2026 CLÔTURÉE + juillet 2026 BROUILLON (calculées par lib/paie)
 *   - Congés, soldes, feuilles de temps (cas CONTE), prêt FAYE
 *   - Tickets support, annonces, incidents, équipe console, crons
 *   - Utilisateurs de test (un par rôle) — mot de passe factice : Test1234!
 *
 * Usage : npm run seed   (idempotent : refuse de tourner si GARAYA existe déjà)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  calculerBulletin,
  calculHeuresSup,
  type BaremePaie,
} from "../lib/paie";
import {
  FIXTURES_GARAYA,
  BAREME_RTS_V2026_1,
  COTISATIONS_V2026_1,
} from "../tests/paie/garaya.fixtures";

config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_PASSWORD = "Test1234!"; // mot de passe factice, comptes de test uniquement

function fail(step: string, error: unknown): never {
  console.error(`✗ ${step} :`, error);
  process.exit(1);
}
async function ins<T extends object>(
  table: string,
  rows: T | T[],
  select = "id"
): Promise<Record<string, unknown>[]> {
  const { data, error } = await sb.from(table).insert(rows).select(select);
  if (error) fail(`insert ${table}`, error.message);
  return data as unknown as Record<string, unknown>[];
}
async function createUser(email: string) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) fail(`createUser ${email}`, error.message);
  return data.user.id;
}

const bareme: BaremePaie = {
  brackets: BAREME_RTS_V2026_1,
  cnss: COTISATIONS_V2026_1.cnss,
  vf: COTISATIONS_V2026_1.vf,
  cfpa: COTISATIONS_V2026_1.cfpa,
};

async function main() {
  // ---------- Garde-fou idempotence ----------
  const { data: existing } = await sb.from("companies").select("id").eq("name", "GARAYA HOLDING").maybeSingle();
  if (existing) {
    console.log("⚠ GARAYA HOLDING existe déjà — seed annulé (base non vierge).");
    return;
  }

  // ---------- Globales : barèmes, fériés, plans, promos ----------
  await ins("tax_brackets", BAREME_RTS_V2026_1.map((b, i) => ({
    version_ref: "v2026.1", effective_from: "2026-01-01", bracket_order: i,
    lower_bound: b.lower, upper_bound: b.upper, rate: b.rate,
  })));
  await ins("contribution_rates", [
    { version_ref: "v2026.1", effective_from: "2026-01-01", code: "cnss", employee_rate: 0.05, employer_rate: 0.18, ceiling: 2_500_000 },
    // Assiette VF (confirmée 17/07/2026) : brut − MIN(150 000 ; 6 % × brut)
    { version_ref: "v2026.1", effective_from: "2026-01-01", code: "vf", employee_rate: 0, employer_rate: 0.06, abatement_type: "min_fixed_rate", abatement_value: 150_000 },
    { version_ref: "v2026.1", effective_from: "2026-01-01", code: "cfpa", employee_rate: 0, employer_rate: 0.015 },
  ]);
  await ins("public_holidays", [
    { year: 2026, holiday_date: "2026-01-01", name: "Nouvel An", variable: false },
    { year: 2026, holiday_date: "2026-03-20", name: "Aïd el-Fitr", variable: true },
    { year: 2026, holiday_date: "2026-05-01", name: "Fête du Travail", variable: false },
    { year: 2026, holiday_date: "2026-05-27", name: "Aïd el-Kébir (Tabaski)", variable: true },
    { year: 2026, holiday_date: "2026-08-27", name: "Journée des Martyrs", variable: false },
    { year: 2026, holiday_date: "2026-10-02", name: "Fête de l'Indépendance", variable: false },
    { year: 2026, holiday_date: "2026-12-25", name: "Noël", variable: false },
  ]);
  const plans = await ins("plans", [
    { code: "starter", name: "Starter", price_gnf: 450_000, max_employees: 15, max_users: 3, highlighted: false, features: ["Personnel, paie, congés", "Documents PDF", "3 utilisateurs"] },
    { code: "business", name: "Business", price_gnf: 950_000, max_employees: 50, max_users: null, highlighted: true, features: ["Tout Starter +", "Temps & heures sup.", "Portail employé", "Utilisateurs illimités"] },
    { code: "cabinet", name: "Cabinet", price_gnf: null, max_employees: null, max_users: null, highlighted: false, features: ["Plusieurs entreprises", "Facturation consolidée", "Support dédié"] },
  ], "id, code");
  const planId = (code: string) => (plans as { id: string; code: string }[]).find((p) => p.code === code)!.id;
  await ins("promo_codes", [
    { code: "LANCEMENT26", discount_percent: 20, duration_months: 3, max_uses: 50, used_count: 17, expires_at: "2026-12-31" },
    { code: "CABINET10", discount_percent: 10, duration_months: 12, max_uses: 10, used_count: 2 },
  ]);

  // ---------- Entreprises ----------
  const [garaya] = await ins("companies", {
    name: "GARAYA HOLDING", legal_form: "SARL", nif: "375106275",
    cnss_employer_number: "GH-2016-0448", address: "Kipé, Commune de Ratoma",
    city: "Conakry", sector: "Holding", bank_name: "BIG — Banque Int. de Guinée",
    bank_account: "461452510189", status: "active", next_employee_seq: 25,
  }) as { id: string }[];
  const [injelec] = await ins("companies", {
    name: "INJELEC-GUINÉE", legal_form: "SARL", nif: "441209883", address: "Kaloum", city: "Conakry",
    sector: "Électricité", status: "active", next_employee_seq: 4,
  }) as { id: string }[];
  const [soguipah] = await ins("companies", {
    name: "SOGUIPAH SARL", legal_form: "SARL", address: "Conakry", city: "Conakry",
    sector: "Agro-industrie", status: "trial", next_employee_seq: 2,
  }) as { id: string }[];
  const G = garaya.id;

  // ---------- Abonnements & factures ----------
  await ins("subscriptions", [
    { company_id: G, plan_id: planId("business"), status: "active", trial_ends_at: null, current_period_start: "2026-07-24", current_period_end: "2026-08-24", payment_method: "card", failed_payments: 0 },
    { company_id: injelec.id, plan_id: planId("business"), status: "past_due", trial_ends_at: null, current_period_start: "2026-06-01", current_period_end: "2026-06-30", payment_method: "card", failed_payments: 3 },
    { company_id: soguipah.id, plan_id: null, status: "trial", trial_ends_at: "2026-07-18", current_period_start: null, current_period_end: null, payment_method: "card", failed_payments: 0 },
  ]);
  await ins("invoices", [
    { company_id: G, number: "F-2026-0812", amount_gnf: 950_000, period_start: "2026-07-24", period_end: "2026-08-24", status: "paid", paid_at: "2026-07-24T08:00:00Z" },
    { company_id: G, number: "F-2026-0704", amount_gnf: 950_000, period_start: "2026-06-24", period_end: "2026-07-24", status: "paid", paid_at: "2026-06-24T10:05:00Z" },
    { company_id: injelec.id, number: "F-2026-0630", amount_gnf: 950_000, period_start: "2026-06-30", period_end: "2026-07-30", status: "failed" },
  ]);

  // ---------- Référentiels GARAYA ----------
  const deps = await ins("departments", [
    { company_id: G, code: "DAF", name: "DAF & Comptabilité" },
    { company_id: G, code: "DRH", name: "D.R.H & Formation" },
    { company_id: G, code: "CONF", name: "Conformité" },
    { company_id: G, code: "DG", name: "Direction générale" },
  ], "id, code") as { id: string; code: string }[];
  const dep = (c: string) => deps.find((d) => d.code === c)!.id;

  const posts = await ins("positions", [
    ["Comptable", "Employé"], ["D.R.H", "Cadre"], ["Caissière", "Employé"],
    ["Facturier", "Employé"], ["Formatrice", "Employé"], ["Formateur", "Employé"],
    ["R.A.F", "Cadre"], ["Contrôleur", "Employé"], ["Assistante RH", "Employé"],
  ].map(([title, category]) => ({ company_id: G, title, category })), "id, title") as { id: string; title: string }[];
  const post = (t: string) => posts.find((p) => p.title === t)!.id;

  await ins("contract_types", [
    { company_id: G, code: "CDI", name: "Contrat à durée indéterminée", max_months: null, requires_end_date: false },
    { company_id: G, code: "CDD", name: "Contrat à durée déterminée", max_months: 24, requires_end_date: true },
  ]);
  await ins("leave_types", [
    { company_id: G, code: "CA", name: "Congé annuel", paid: true, entitlement_days: null, deducts_balance: true },
    { company_id: G, code: "CM", name: "Congé maladie", paid: true, entitlement_days: null, deducts_balance: false },
    { company_id: G, code: "CMAT", name: "Congé maternité", paid: true, entitlement_days: 98, deducts_balance: false },
    { company_id: G, code: "PERM", name: "Permission exceptionnelle", paid: true, entitlement_days: null, deducts_balance: false },
    { company_id: G, code: "ANJ", name: "Absence non justifiée", paid: false, entitlement_days: null, deducts_balance: false },
  ]);
  await ins("premium_types", [
    { company_id: G, code: "ANC", name: "Prime d'ancienneté", taxable_rts: true, subject_cnss: true },
    { company_id: G, code: "REPAS", name: "Prime de repas", taxable_rts: false, subject_cnss: true },
    { company_id: G, code: "LOG", name: "Indemnité de logement", taxable_rts: false, subject_cnss: false },
    { company_id: G, code: "TRANS", name: "Indemnité de transport", taxable_rts: false, subject_cnss: false },
    { company_id: G, code: "CHERTE", name: "Indemnité cherté de vie", taxable_rts: false, subject_cnss: false },
  ]);

  // ---------- Salariés GARAYA (8 fixtures + 1 en essai) ----------
  const META: Record<string, { dep: string; post: string; hire: string; birth: string; phone: string; contract?: "CDD"; end?: string }> = {
    "EMP-002": { dep: "DAF", post: "Comptable", hire: "2016-05-01", birth: "1988-03-14", phone: "628 44 12 09" },
    "EMP-004": { dep: "DRH", post: "D.R.H", hire: "2017-02-01", birth: "1984-06-02", phone: "622 18 40 27" },
    "EMP-005": { dep: "DAF", post: "Caissière", hire: "2019-09-01", birth: "1992-11-23", phone: "621 33 08 71" },
    "EMP-006": { dep: "CONF", post: "Facturier", hire: "2025-01-15", birth: "1996-04-08", phone: "620 55 12 44", contract: "CDD", end: "2026-07-31" },
    "EMP-007": { dep: "DRH", post: "Formatrice", hire: "2016-12-01", birth: "1990-01-30", phone: "628 77 45 12" },
    "EMP-008": { dep: "DRH", post: "Formateur", hire: "2016-01-12", birth: "1987-08-19", phone: "625 90 33 60" },
    "EMP-009": { dep: "DAF", post: "R.A.F", hire: "2015-03-01", birth: "1982-05-11", phone: "622 45 67 89" },
    "EMP-010": { dep: "CONF", post: "Contrôleur", hire: "2018-06-01", birth: "1991-09-05", phone: "624 12 78 90" },
  };
  const empIds: Record<string, string> = {};
  for (const f of FIXTURES_GARAYA) {
    const m = META[f.matricule];
    const [last, ...firstParts] = f.nom.split(" ");
    const [row] = await ins("employees", {
      company_id: G, matricule: f.matricule, last_name: last, first_name: firstParts.join(" "),
      birth_date: m.birth, hire_date: m.hire, contract_type: m.contract ?? "CDI",
      contract_end_date: m.end ?? null, department_id: dep(m.dep), position_id: post(m.post),
      phone: m.phone, email: `${firstParts.join(".").toLowerCase()}.${last.toLowerCase()}@garaya.gn`.replace(/\s/g, ""),
      cnss_number: `11905 ${1200 + Number(f.matricule.slice(4))}`, status: "actif",
      address: "Commune de Ratoma, Conakry", bank_name: "BIG", payment_mode: "Virement",
    }) as { id: string }[];
    empIds[f.matricule] = row.id;
    await ins("employee_compensation", {
      employee_id: row.id, company_id: G,
      base_salary: f.entree.baseSalary, seniority_bonus: f.entree.seniorityBonus,
      meal_allowance: f.entree.mealAllowance, housing_allowance: f.entree.housingAllowance,
      transport_allowance: f.entree.transportAllowance, cost_of_living_allowance: f.entree.costOfLivingAllowance,
    }, "employee_id");
  }
  // Hiérarchie : PLEGNEMOU (R.A.F) manage DAF+CONF ; TOLNO manage DRH
  await sb.from("employees").update({ manager_id: empIds["EMP-009"] })
    .in("id", [empIds["EMP-002"], empIds["EMP-005"], empIds["EMP-006"], empIds["EMP-010"]]);
  await sb.from("employees").update({ manager_id: empIds["EMP-004"] })
    .in("id", [empIds["EMP-007"], empIds["EMP-008"]]);
  // DIALLO Fatoumata — période d'essai (maquette)
  const [diallo] = await ins("employees", {
    company_id: G, matricule: "EMP-024", last_name: "DIALLO", first_name: "Fatoumata",
    birth_date: "1998-02-14", hire_date: "2026-05-20", trial_end_date: "2026-07-20",
    department_id: dep("DRH"), position_id: post("Assistante RH"), manager_id: empIds["EMP-004"],
    email: "f.diallo@garaya.gn", status: "essai",
  }) as { id: string }[];
  await ins("employee_compensation", { employee_id: diallo.id, company_id: G, base_salary: 1_700_000 }, "employee_id");

  // Prêt FAYE : mensualité 2 016 982, 8/24 payées
  await ins("loans", {
    company_id: G, employee_id: empIds["EMP-002"], loan_type: "pret",
    total_amount: 48_407_566, monthly_amount: 2_016_982, installments_total: 24,
    installments_paid: 8, start_date: "2024-02-15", status: "actif",
  });
  // Mouvement historique (augmentation FAYE 2 800 000 → 3 000 000)
  await ins("employee_movements", {
    company_id: G, employee_id: empIds["EMP-002"], movement_type: "augmentation",
    field_changed: "base_salary", old_value: "2800000", new_value: "3000000",
    reason: "Révision annuelle", effective_date: "2026-06-01",
  });

  // ---------- Paies : juin 2026 (clôturée) + juillet 2026 (brouillon) ----------
  for (const [month, status] of [[6, "cloture"], [7, "brouillon"]] as const) {
    const [run] = await ins("payroll_runs", {
      company_id: G, period_year: 2026, period_month: month,
      status: "brouillon", generated_at: `2026-0${month}-10T09:14:00Z`, bareme_version: "v2026.1",
    }) as { id: string }[];
    for (const f of FIXTURES_GARAYA) {
      const b = calculerBulletin(
        {
          baseSalary: f.entree.baseSalary, seniorityBonus: f.entree.seniorityBonus,
          mealAllowance: f.entree.mealAllowance, housingAllowance: f.entree.housingAllowance,
          transportAllowance: f.entree.transportAllowance, costOfLivingAllowance: f.entree.costOfLivingAllowance,
        },
        bareme,
        { retenues: f.entree.retenues }
      );
      await ins("payslips", {
        company_id: G, payroll_run_id: run.id, employee_id: empIds[f.matricule],
        employee_name: f.nom, matricule: f.matricule, position_title: META[f.matricule].post,
        gross: b.brut, base_cnss: b.baseCnss, cnss_employee: b.cnssSalariale,
        cnss_employer: b.cnssPatronale, taxable_net: b.netImposable, rts: b.rts,
        vf_base: b.vfBase, vf: b.vf, cfpa: b.cfpa,
        loans_deduction: f.entree.retenues, net_pay: b.netAPayer,
        earnings: [
          { libelle: "Salaire de base", montant: f.entree.baseSalary },
          { libelle: "Prime d'ancienneté", montant: f.entree.seniorityBonus },
          { libelle: "Prime de repas", montant: f.entree.mealAllowance },
          { libelle: "Indemnité de logement", montant: f.entree.housingAllowance },
          { libelle: "Indemnité de transport", montant: f.entree.transportAllowance },
          { libelle: "Indemnité de cherté de vie", montant: f.entree.costOfLivingAllowance },
        ],
      });
      // Métadonnées bulletin (le PDF réel = étape O)
      await ins("documents", {
        company_id: G, employee_id: empIds[f.matricule], doc_type: "bulletin", category: "paie",
        title: `Bulletin de paie — ${f.nom}`, period: `2026-0${month}`,
      });
    }
    if (status === "cloture") {
      await sb.from("payroll_runs").update({ status: "cloture", closed_at: "2026-06-30T17:40:00Z" }).eq("id", run.id);
    }
  }

  // ---------- Congés : soldes + demandes ----------
  for (const f of FIXTURES_GARAYA) {
    const anc = new Date("2026-07-01").getFullYear() - new Date(META[f.matricule].hire).getFullYear();
    await ins("leave_balances", {
      company_id: G, employee_id: empIds[f.matricule], year: 2026,
      entitled_days: 17.5, seniority_bonus_days: Math.floor(anc / 5),
      taken_days: f.matricule === "EMP-002" ? 7 : f.matricule === "EMP-007" ? 6 : 0,
    }, "id");
  }
  await ins("leave_requests", [
    { company_id: G, employee_id: empIds["EMP-007"], leave_type_code: "CA", start_date: "2026-08-04", end_date: "2026-08-15", working_days: 9, status: "attente_rh", manager_decision_at: "2026-07-09T10:00:00Z" },
    { company_id: G, employee_id: empIds["EMP-010"], leave_type_code: "PERM", start_date: "2026-07-21", end_date: "2026-07-21", working_days: 1, comment: "Mariage", status: "attente_manager" },
    { company_id: G, employee_id: empIds["EMP-005"], leave_type_code: "CM", start_date: "2026-07-10", end_date: "2026-07-11", working_days: 2, comment: "Certificat joint", status: "attente_rh", manager_decision_at: "2026-07-10T08:00:00Z" },
    { company_id: G, employee_id: empIds["EMP-002"], leave_type_code: "CA", start_date: "2026-03-10", end_date: "2026-03-17", working_days: 6, status: "approuve", manager_decision_at: "2026-03-02T09:00:00Z", rh_decision_at: "2026-03-02T15:00:00Z" },
    { company_id: G, employee_id: empIds["EMP-008"], leave_type_code: "PERM", start_date: "2026-07-21", end_date: "2026-07-21", working_days: 1, comment: "Mariage", status: "approuve", rh_decision_at: "2026-07-08T11:00:00Z" },
    { company_id: G, employee_id: empIds["EMP-006"], leave_type_code: "CA", start_date: "2026-07-28", end_date: "2026-08-08", working_days: 9, status: "refuse", refusal_reason: "Fin de CDD le 31/07 — solde payé au solde de tout compte", rh_decision_at: "2026-07-05T14:00:00Z" },
    { company_id: G, employee_id: empIds["EMP-010"], leave_type_code: "CA", start_date: "2026-06-02", end_date: "2026-06-06", working_days: 5, status: "refuse", refusal_reason: "Effectif insuffisant — inventaire semestriel", manager_decision_at: "2026-05-20T10:00:00Z" },
  ]);

  // ---------- Temps : juillet 2026 (cas CONTE = 8h/4h/3h → 254 810 GNF) ----------
  await ins("timesheets", [
    { company_id: G, employee_id: empIds["EMP-002"], period_year: 2026, period_month: 7, total_hours: 173.3, overtime_25: 0, overtime_50: 0, overtime_100: 0, overtime_amount: 0, status: "valide" },
    { company_id: G, employee_id: empIds["EMP-006"], period_year: 2026, period_month: 7, total_hours: 181.3, overtime_25: 8, overtime_50: 0, overtime_100: 0, overtime_amount: calculHeuresSup(1_500_000, 173.33, { h25: 8, h50: 0, h100: 0 }), status: "valide" },
    { company_id: G, employee_id: empIds["EMP-010"], period_year: 2026, period_month: 7, total_hours: 188.3, overtime_25: 8, overtime_50: 4, overtime_100: 3, overtime_amount: calculHeuresSup(2_000_000, 173.33, { h25: 8, h50: 4, h100: 3 }), status: "a_valider" },
    { company_id: G, employee_id: empIds["EMP-008"], period_year: 2026, period_month: 7, total_hours: 166.3, overtime_25: 0, overtime_50: 0, overtime_100: 0, overtime_amount: 0, status: "a_valider" },
  ]);

  // ---------- Console : tickets, annonces, incidents, équipe, crons ----------
  const [t248] = await ins("support_tickets", {
    company_id: G, subject: "Écart RTS sur bulletin de M. Plegnemou", priority: "urgent",
    status: "en_cours", assigned_to: "Aïssatou D.",
  }) as { id: string }[];
  await ins("support_ticket_messages", [
    { ticket_id: t248.id, author_type: "client", author_name: "M. Tolno", body: "Le bulletin de M. Plegnemou affiche une RTS de 146 800 GNF mais notre ancien fichier Excel donnait 152 300. Pouvez-vous vérifier ?" },
    { ticket_id: t248.id, author_type: "support", author_name: "Aïssatou (support)", body: "Vérification faite : l'écart vient d'une prime saisie comme imposable dans l'ancien fichier alors qu'elle est exonérée. Le calcul Nex'SIRH est conforme au barème v2026.1." },
  ], "id");
  await ins("support_tickets", [
    { company_id: soguipah.id, subject: "Import Excel : colonnes non reconnues", priority: "normal", status: "attente_client", assigned_to: "Mamadou K." },
    { company_id: injelec.id, subject: "Demande : paiement Orange Money", priority: "basse", status: "ouvert" },
  ]);
  await ins("announcements", [
    { title: "🎉 Nouveau : portail employé disponible", channel: "banniere_email", target: "tous", status: "envoyee", sent_at: "2026-07-01T08:00:00Z", scheduled_at: null, stats: { open_rate: 0.72 } },
    { title: "⏳ Votre essai expire dans 5 jours", channel: "email_auto", target: "essais_j25", status: "envoyee", sent_at: "2026-07-11T08:00:00Z", scheduled_at: null, stats: { conversion: 0.41 } },
    { title: "🔧 Maintenance planifiée dim. 19/07, 22 h – 23 h", channel: "banniere", target: "tous", status: "programmee", sent_at: null, scheduled_at: "2026-07-17T08:00:00Z", stats: {} },
  ]);
  await ins("platform_incidents", [
    { title: "Lenteur génération PDF", severity: "mineur", description: "Pic de charge (fin de mois). Résolu : file d'attente augmentée.", started_at: "2026-07-08T14:10:00Z", resolved_at: "2026-07-08T14:32:00Z" },
    { title: "Migration base v1.4 — index paie", severity: "maintenance", started_at: "2026-06-21T03:00:00Z", resolved_at: "2026-06-21T03:05:00Z" },
  ]);
  await ins("admin_team_members", [
    { name: "Aïssatou DIALLO", email: "support@nexsirh.gn", console_role: "support" },
    { name: "Mamadou KEITA", email: "tech@nexsirh.gn", console_role: "technique" },
  ]);
  await ins("cron_runs", [
    { task_name: "Alertes RH (CDD, pièces, essais)", frequency: "Quotidien 06:00", ran_at: "2026-07-16T06:00:00Z", duration_ms: 1200, status: "ok" },
    { task_name: "Emails essais expirants", frequency: "Quotidien 08:00", ran_at: "2026-07-16T08:00:00Z", duration_ms: 800, status: "ok" },
    { task_name: "Relances impayés (Stripe)", frequency: "Quotidien 09:00", ran_at: "2026-07-16T09:00:00Z", duration_ms: 2100, status: "warn", detail: "2 échecs client" },
    { task_name: "Sauvegarde base + Storage", frequency: "Quotidien 04:00", ran_at: "2026-07-16T04:00:00Z", duration_ms: 180000, status: "ok" },
  ]);

  // ---------- Utilisateurs de test (un par rôle) ----------
  const users: [string, string, string, string | null][] = [
    // email, nom, rôle, employee matricule
    ["m.tolno@garaya.gn", "Michel TOLNO", "admin", "EMP-004"],
    ["rh@garaya.gn", "Rokia RH", "rh", null],
    ["dg@garaya.gn", "Ibrahima SOW", "dg", null],
    ["g.plegnemou@garaya.gn", "Gassim PLEGNEMOU", "manager", "EMP-009"],
    ["faye.a@garaya.gn", "Aboubacar FAYE", "comptable", "EMP-002"],
    ["b.camara@garaya.gn", "Bountouraby CAMARA", "employe", "EMP-007"],
  ];
  for (const [email, name, role, mat] of users) {
    const uid = await createUser(email);
    await ins("profiles", {
      id: uid, company_id: G, role, full_name: name, email,
      employee_id: mat ? empIds[mat] : null,
    });
  }
  // Admin INJELEC (tests d'isolation inter-tenants)
  const uidInj = await createUser("admin@injelec.gn");
  await ins("profiles", { id: uidInj, company_id: injelec.id, role: "admin", full_name: "Admin INJELEC", email: "admin@injelec.gn" });
  // Un salarié minimal chez INJELEC pour vérifier l'étanchéité
  const [empInj] = await ins("employees", {
    company_id: injelec.id, matricule: "EMP-001", last_name: "BAH", first_name: "Ousmane",
    birth_date: "1990-01-01", hire_date: "2020-01-01", email: "o.bah@injelec.gn",
  }) as { id: string }[];
  await ins("employee_compensation", { employee_id: empInj.id, company_id: injelec.id, base_salary: 2_000_000 }, "employee_id");

  console.log("✓ Seed terminé :");
  console.log("  - 3 entreprises, 10 salariés (8 fixtures GARAYA + DIALLO + BAH/INJELEC)");
  console.log("  - Paies juin (CLÔTURÉE) + juillet (brouillon) calculées par lib/paie");
  console.log("  - 7 demandes de congés, 4 feuilles de temps, 1 prêt, 4 tickets/annonces/incidents");
  console.log(`  - 7 comptes de test (mot de passe : ${TEST_PASSWORD})`);
}

main().catch((e) => fail("seed", e));
