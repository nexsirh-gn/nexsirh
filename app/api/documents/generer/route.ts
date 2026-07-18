import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attestationTravail, certificatTravail, certificatConge, soldeToutCompte,
  ficheIndividuelle, journalPaie, etatRts, declarationCnss, etatSalaires,
  registrePersonnel, suiviConges,
  type Entreprise, type Salarie, type LignePaie,
} from "@/lib/pdf/documents";
import { calculerSoldeToutCompte, BAREME_STC_DEFAUT, type MotifDepart } from "@/lib/paie/solde";

const MOIS = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const TITRES: Record<string, string> = {
  attestation_travail: "Attestation de travail",
  certificat_travail: "Certificat de travail",
  certificat_conge: "Certificat de congé",
  solde_tout_compte: "Solde de tout compte",
  fiche_individuelle: "Fiche individuelle",
  journal_paie: "Journal de paie",
  etat_rts: "État RTS mensuel",
  declaration_cnss: "Déclaration CNSS mensuelle",
  etat_salaires: "État des salaires",
  registre_personnel: "Registre du personnel",
  suivi_conges: "Suivi des congés",
};

const erreur = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

async function chargerSalarie(sb: SupabaseClient, id: string): Promise<Salarie | null> {
  const { data } = await sb.from("employees")
    .select("*, positions(title), departments(name)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    poste: (data.positions as { title: string } | null)?.title ?? null,
    departement: (data.departments as { name: string } | null)?.name ?? null,
  } as Salarie;
}

async function chargerPaie(sb: SupabaseClient, runId: string) {
  const { data: run } = await sb.from("payroll_runs")
    .select("period_year, period_month").eq("id", runId).maybeSingle();
  if (!run) return null;
  const { data: lignes } = await sb.from("payslips").select("*")
    .eq("payroll_run_id", runId).order("matricule");
  return {
    periode: `${MOIS[run.period_month]} ${run.period_year}`,
    periodeCode: `${run.period_year}-${String(run.period_month).padStart(2, "0")}`,
    lignes: (lignes ?? []) as LignePaie[],
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const employeeId = url.searchParams.get("employee");
  const runId = url.searchParams.get("run");
  if (!TITRES[type]) return erreur(`Type de document inconnu : ${type}`);

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return erreur("Non connecté.", 401);

  const { data: profil } = await sb.from("profiles")
    .select("company_id, role").eq("id", user.id).single();

  // Documents d'entreprise : réservés aux rôles paie/RH (un employé n'a pas
  // à produire un journal de paie, même limité à sa propre ligne par la RLS)
  const TYPES_ENTREPRISE = ["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires", "registre_personnel", "suivi_conges"];
  if (TYPES_ENTREPRISE.includes(type) && !["admin", "rh", "dg", "comptable"].includes(profil?.role ?? "")) {
    return erreur("Document réservé aux rôles RH / Direction / Comptable.", 403);
  }
  const { data: comp } = await sb.from("companies")
    .select("name, address, nif").eq("id", profil!.company_id).maybeSingle();
  if (!comp) return erreur("Entreprise introuvable.", 404);
  const entreprise: Entreprise = comp;

  let pdf: Uint8Array;
  let periode: string | null = null;
  let nomFichier = type;

  // ----- Documents individuels (salarié requis) -----
  if (["attestation_travail", "certificat_travail", "certificat_conge", "solde_tout_compte", "fiche_individuelle"].includes(type)) {
    if (!employeeId) return erreur("Paramètre employee requis.");
    const s = await chargerSalarie(sb, employeeId);
    if (!s) return erreur("Salarié introuvable ou accès refusé.", 404);
    nomFichier = `${type}_${s.matricule}`;

    if (type === "attestation_travail") pdf = await attestationTravail(entreprise, s);
    else if (type === "certificat_travail") pdf = await certificatTravail(entreprise, s);
    else if (type === "fiche_individuelle") pdf = await ficheIndividuelle(entreprise, s);
    else if (type === "certificat_conge") {
      const { data: conge } = await sb.from("leave_requests")
        .select("start_date, end_date, working_days, leave_type_code")
        .eq("employee_id", employeeId).eq("status", "approuve")
        .order("start_date", { ascending: false }).limit(1).maybeSingle();
      if (!conge) return erreur("Aucun congé approuvé pour ce salarié.", 404);
      pdf = await certificatConge(entreprise, s, conge);
    } else {
      // Solde de tout compte : CALCUL COMPLET (congés, prorata, licenciement, préavis)
      // Nécessite la rémunération → la RLS la réserve aux rôles admin/rh/dg.
      const motif = (url.searchParams.get("motif") ?? "licenciement") as MotifDepart;
      const preavisEffectue = url.searchParams.get("preavis") !== "non_effectue";
      if (!["demission", "licenciement", "fin_cdd", "retraite"].includes(motif)) {
        return erreur("Motif invalide (demission | licenciement | fin_cdd | retraite).");
      }
      const [{ data: solde }, { data: comp2 }] = await Promise.all([
        sb.from("leave_balances")
          .select("entitled_days, seniority_bonus_days, carryover_days, taken_days")
          .eq("employee_id", employeeId).eq("year", 2026).maybeSingle(),
        sb.from("employee_compensation")
          .select("base_salary, seniority_bonus, meal_allowance, housing_allowance, transport_allowance, cost_of_living_allowance, other_bonuses")
          .eq("employee_id", employeeId).maybeSingle(),
      ]);
      if (!comp2) return erreur("Rémunération non accessible : le solde de tout compte est réservé aux rôles RH.", 403);
      const brutMensuel =
        comp2.base_salary + comp2.seniority_bonus + comp2.meal_allowance +
        comp2.housing_allowance + comp2.transport_allowance +
        comp2.cost_of_living_allowance + comp2.other_bonuses;
      const resultat = calculerSoldeToutCompte({
        brutMensuel,
        categorie: (s as unknown as { category?: string }).category ?? "Employé",
        ancienneteAnnees: Math.floor(
          (Date.now() - new Date(s.hire_date).getTime()) / (365.25 * 86400e3)
        ),
        soldeConges: solde
          ? solde.entitled_days + solde.seniority_bonus_days + solde.carryover_days - solde.taken_days
          : 0,
        dateSortie: s.exit_date ? new Date(s.exit_date) : new Date(),
        motif,
        preavisEffectue,
        bareme: BAREME_STC_DEFAUT,
      });
      pdf = await soldeToutCompte(entreprise, s, { motif, ...resultat });
    }
  }

  // ----- États de paie (période requise) -----
  else if (["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires"].includes(type)) {
    if (!runId) return erreur("Paramètre run requis.");
    const paie = await chargerPaie(sb, runId);
    if (!paie || paie.lignes.length === 0) return erreur("Période de paie introuvable ou accès refusé.", 404);
    periode = paie.periodeCode;
    nomFichier = `${type}_${paie.periodeCode}`;
    if (type === "journal_paie") pdf = await journalPaie(entreprise, paie.periode, paie.lignes);
    else if (type === "etat_rts") pdf = await etatRts(entreprise, paie.periode, paie.lignes);
    else if (type === "declaration_cnss") pdf = await declarationCnss(entreprise, paie.periode, paie.lignes);
    else pdf = await etatSalaires(entreprise, paie.periode, paie.lignes);
  }

  // ----- Registres (entreprise entière) -----
  else if (type === "registre_personnel") {
    const { data: emps } = await sb.from("employees")
      .select("*, positions(title), departments(name)").order("matricule");
    if (!emps || emps.length === 0) return erreur("Aucun salarié visible.", 404);
    const salaries = emps.map((d) => ({
      ...d,
      poste: (d.positions as { title: string } | null)?.title ?? null,
      departement: (d.departments as { name: string } | null)?.name ?? null,
    })) as Salarie[];
    pdf = await registrePersonnel(entreprise, salaries);
  } else {
    // suivi_conges
    const annee = 2026;
    periode = String(annee);
    const { data: balances } = await sb.from("leave_balances")
      .select("entitled_days, seniority_bonus_days, carryover_days, taken_days, employees(matricule, first_name, last_name)")
      .eq("year", annee);
    if (!balances || balances.length === 0) return erreur("Aucun solde de congés visible.", 404);
    const lignes = balances
      .map((b) => {
        const emp = b.employees as unknown as { matricule: string; first_name: string; last_name: string } | null;
        return {
          matricule: emp?.matricule ?? "—",
          nom: emp ? `${emp.last_name} ${emp.first_name}` : "—",
          acquis: b.entitled_days, anciennete: b.seniority_bonus_days,
          report: b.carryover_days, pris: b.taken_days,
        };
      })
      .sort((a, b) => a.matricule.localeCompare(b.matricule));
    pdf = await suiviConges(entreprise, annee, lignes);
  }

  // ----- Archivage des métadonnées (au mieux : la RLS peut refuser selon le rôle) -----
  await sb.from("documents").insert({
    company_id: profil!.company_id,
    employee_id: employeeId ?? null,
    doc_type: type,
    category: ["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires"].includes(type) ? "paie"
      : ["registre_personnel", "suivi_conges"].includes(type) ? "legal" : "rh",
    title: TITRES[type],
    period: periode,
    generated_by: user.id,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}.pdf"`,
    },
  });
}
