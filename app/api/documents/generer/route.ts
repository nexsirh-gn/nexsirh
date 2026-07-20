import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attestationTravail, certificatTravail, certificatConge, soldeToutCompte,
  ficheIndividuelle, journalPaie, etatRts, declarationCnss, etatSalaires,
  registrePersonnel, suiviConges,
  etatEffectifs, syntheseMasseSalariale, etatContratsEcheance,
  type Entreprise, type Salarie, type LignePaie,
} from "@/lib/pdf/documents";
import { calculerSoldeToutCompte, BAREME_STC_DEFAUT, type MotifDepart } from "@/lib/paie/solde";
import {
  xlsxDeclarationCnss, xlsxEtatRts, xlsxEtatSalaires, xlsxJournalPaie,
  xlsxRegistrePersonnel, xlsxSuiviConges, xlsxFicheIndividuelle, xlsxBilanSocial,
  xlsxEtatEffectifs, xlsxSyntheseMasseSalariale, xlsxEtatContratsEcheance,
} from "@/lib/excel/documents";

const TYPES_XLSX = ["declaration_cnss", "etat_rts", "etat_salaires", "journal_paie",
  "registre_personnel", "suivi_conges", "fiche_individuelle", "bilan_social",
  "effectifs_departement", "synthese_masse_salariale", "contrats_echeance"];

function reponseFichier(contenu: Uint8Array | Buffer, nom: string, xlsx: boolean) {
  return new NextResponse(Buffer.from(contenu), {
    headers: {
      "Content-Type": xlsx
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}.${xlsx ? "xlsx" : "pdf"}"`,
    },
  });
}

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
  bilan_social: "Bilan social annuel",
  effectifs_departement: "État des effectifs par département",
  synthese_masse_salariale: "Synthèse masse salariale annuelle",
  contrats_echeance: "État des contrats à échéance",
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
  const xlsx = url.searchParams.get("format") === "xlsx";
  if (!TITRES[type]) return erreur(`Type de document inconnu : ${type}`);
  if (xlsx && !TYPES_XLSX.includes(type)) {
    return erreur(`Le format Excel n'est pas disponible pour « ${TITRES[type]} » (PDF uniquement).`);
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return erreur("Non connecté.", 401);

  const { data: profil } = await sb.from("profiles")
    .select("company_id, role, full_name").eq("id", user.id).single();
  const auteur = profil?.full_name ?? "Utilisateur";

  // Documents d'entreprise : réservés aux rôles paie/RH (un employé n'a pas
  // à produire un journal de paie, même limité à sa propre ligne par la RLS)
  const TYPES_ENTREPRISE = ["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires", "registre_personnel", "suivi_conges", "bilan_social", "effectifs_departement", "synthese_masse_salariale", "contrats_echeance"];
  if (TYPES_ENTREPRISE.includes(type) && !["admin", "rh", "dg", "comptable"].includes(profil?.role ?? "")) {
    return erreur("Document réservé aux rôles RH / Direction / Comptable.", 403);
  }
  const { data: comp } = await sb.from("companies")
    .select("name, address, nif").eq("id", profil!.company_id).maybeSingle();
  if (!comp) return erreur("Entreprise introuvable.", 404);
  const entreprise: Entreprise = comp;

  let contenu: Uint8Array | Buffer;
  let periode: string | null = null;
  let nomFichier = type;

  // ----- Documents individuels (salarié requis) -----
  if (["attestation_travail", "certificat_travail", "certificat_conge", "solde_tout_compte", "fiche_individuelle"].includes(type)) {
    if (!employeeId) return erreur("Paramètre employee requis.");
    const s = await chargerSalarie(sb, employeeId);
    if (!s) return erreur("Salarié introuvable ou accès refusé.", 404);
    nomFichier = `${type}_${s.matricule}`;

    if (type === "attestation_travail") contenu = await attestationTravail(entreprise, s);
    else if (type === "certificat_travail") contenu = await certificatTravail(entreprise, s);
    else if (type === "fiche_individuelle") {
      if (xlsx) {
        const { data: comp } = await sb.from("employee_compensation")
          .select("base_salary, seniority_bonus, meal_allowance, housing_allowance, transport_allowance, cost_of_living_allowance")
          .eq("employee_id", employeeId).maybeSingle();
        contenu = await xlsxFicheIndividuelle(entreprise, { ...s, comp }, auteur);
      } else {
        contenu = await ficheIndividuelle(entreprise, s);
      }
    }
    else if (type === "certificat_conge") {
      const { data: conge } = await sb.from("leave_requests")
        .select("start_date, end_date, working_days, leave_type_code")
        .eq("employee_id", employeeId).eq("status", "approuve")
        .order("start_date", { ascending: false }).limit(1).maybeSingle();
      if (!conge) return erreur("Aucun congé approuvé pour ce salarié.", 404);
      contenu = await certificatConge(entreprise, s, conge);
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
      contenu = await soldeToutCompte(entreprise, s, { motif, ...resultat });
    }
  }

  // ----- États de paie (période requise) -----
  else if (["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires"].includes(type)) {
    if (!runId) return erreur("Paramètre run requis.");
    const paie = await chargerPaie(sb, runId);
    if (!paie || paie.lignes.length === 0) return erreur("Période de paie introuvable ou accès refusé.", 404);
    periode = paie.periodeCode;
    nomFichier = `${type}_${paie.periodeCode}`;
    if (xlsx) {
      // N° CNSS des salariés pour la déclaration (jointure best effort)
      const { data: empsCnss } = await sb.from("employees").select("id, cnss_number");
      const cnssMap = new Map((empsCnss ?? []).map((x) => [x.id, x.cnss_number]));
      const lignes = paie.lignes.map((l) => ({
        ...l,
        cnss_number: cnssMap.get((l as unknown as { employee_id: string }).employee_id) ?? null,
      }));
      if (type === "journal_paie") contenu = await xlsxJournalPaie(entreprise, paie.periode, lignes, auteur);
      else if (type === "etat_rts") contenu = await xlsxEtatRts(entreprise, paie.periode, lignes, auteur);
      else if (type === "declaration_cnss") contenu = await xlsxDeclarationCnss(entreprise, paie.periode, lignes, auteur);
      else contenu = await xlsxEtatSalaires(entreprise, paie.periode, lignes, auteur);
    } else if (type === "journal_paie") contenu = await journalPaie(entreprise, paie.periode, paie.lignes);
    else if (type === "etat_rts") contenu = await etatRts(entreprise, paie.periode, paie.lignes);
    else if (type === "declaration_cnss") contenu = await declarationCnss(entreprise, paie.periode, paie.lignes);
    else contenu = await etatSalaires(entreprise, paie.periode, paie.lignes);
  }

  // ----- Registres (entreprise entière) -----
  else if (type === "registre_personnel") {
    const [{ data: emps }, { data: compsReg }] = await Promise.all([
      sb.from("employees").select("*, positions(title), departments(name)").order("matricule"),
      sb.from("employee_compensation").select("employee_id, base_salary, seniority_bonus, meal_allowance, housing_allowance, transport_allowance, cost_of_living_allowance, other_bonuses"),
    ]);
    if (!emps || emps.length === 0) return erreur("Aucun salarié visible.", 404);
    const brutMap = new Map((compsReg ?? []).map((c) => [c.employee_id,
      c.base_salary + c.seniority_bonus + c.meal_allowance + c.housing_allowance +
      c.transport_allowance + c.cost_of_living_allowance + c.other_bonuses]));
    const salaries = emps.map((d) => ({
      ...d,
      poste: (d.positions as { title: string } | null)?.title ?? null,
      departement: (d.departments as { name: string } | null)?.name ?? null,
      brut: brutMap.get(d.id) ?? null,
    })) as (Salarie & { brut: number | null })[];
    contenu = xlsx
      ? await xlsxRegistrePersonnel(entreprise, salaries, auteur)
      : await registrePersonnel(entreprise, salaries);
  }

  // ----- Bilan social annuel (Excel uniquement) -----
  else if (type === "bilan_social") {
    const annee = Number(url.searchParams.get("annee") ?? new Date().getFullYear());
    periode = String(annee);
    nomFichier = `bilan_social_${annee}`;
    const [{ data: emps }, { data: runs }, { data: slips }] = await Promise.all([
      sb.from("employees").select("*, positions(title)").order("matricule"),
      sb.from("payroll_runs").select("id, period_year, period_month").eq("period_year", annee)
        .order("period_month"),
      sb.from("payslips").select("payroll_run_id, gross, cnss_employee, cnss_employer, rts, vf, cfpa, net_pay"),
    ]);
    if (!emps || emps.length === 0) return erreur("Aucun salarié visible.", 404);
    const salaries = emps.map((d) => ({
      ...d,
      poste: (d.positions as { title: string } | null)?.title ?? null,
      departement: null,
    })) as Salarie[];
    const actifs = salaries.filter((s) => s.status !== "sorti");
    const annees = (dte: string) => (Date.now() - new Date(dte).getTime()) / (365.25 * 86400e3);
    const periodes = (runs ?? []).map((r) => {
      const l = (slips ?? []).filter((s) => s.payroll_run_id === r.id);
      return {
        periode: `${MOIS[r.period_month]} ${r.period_year}`,
        effectif: l.length,
        brut: l.reduce((s, x) => s + x.gross, 0),
        cotisSal: l.reduce((s, x) => s + x.cnss_employee + x.rts, 0),
        chargesPat: l.reduce((s, x) => s + x.cnss_employer + x.vf + x.cfpa, 0),
        net: l.reduce((s, x) => s + x.net_pay, 0),
      };
    });
    const totBrut = periodes.reduce((s, p) => s + p.brut, 0);
    const femmes = actifs.filter((s) => s.civility && s.civility !== "M.").length;
    contenu = await xlsxBilanSocial(entreprise, annee, {
      indicateurs: [
        { libelle: "Effectif actif (au jour de génération)", valeur: actifs.length },
        { libelle: "Effectif total inscrit au registre", valeur: salaries.length },
        { libelle: "Ancienneté moyenne (ans)", valeur: actifs.length ? (actifs.reduce((s, x) => s + annees(x.hire_date), 0) / actifs.length).toFixed(1).replace(".", ",") : "-" },
        { libelle: "Âge moyen (ans)", valeur: actifs.length ? (actifs.reduce((s, x) => s + annees(x.birth_date), 0) / actifs.length).toFixed(1).replace(".", ",") : "-" },
        { libelle: "Ratio femmes / hommes", valeur: actifs.length ? `${Math.round((femmes / actifs.length) * 100)} % / ${100 - Math.round((femmes / actifs.length) * 100)} %` : "-" },
        { libelle: `Masse salariale brute ${annee} (GNF)`, valeur: totBrut },
        { libelle: `Cumul RTS versé ${annee} (GNF)`, valeur: (slips ?? []).reduce((s, x) => s + x.rts, 0) },
        { libelle: `Cumul CNSS salariale + patronale ${annee} (GNF)`, valeur: (slips ?? []).reduce((s, x) => s + x.cnss_employee + x.cnss_employer, 0) },
        { libelle: `Coût employeur total ${annee} (GNF)`, valeur: totBrut + periodes.reduce((s, p) => s + p.chargesPat, 0) },
      ],
      periodes,
      salaries,
    }, auteur);
  }

  // ----- État des effectifs par département (PDF) -----
  else if (type === "effectifs_departement") {
    const { data: emps } = await sb.from("employees")
      .select("status, contract_type, departments(name)");
    if (!emps) return erreur("Aucun salarié visible.", 404);
    const enPoste = emps.filter((e) => e.status !== "sorti");
    const parDep = new Map<string, { actifs: number; essai: number; cdd: number }>();
    for (const e of enPoste) {
      const nom = (e.departments as unknown as { name: string } | null)?.name ?? "Sans département";
      const acc = parDep.get(nom) ?? { actifs: 0, essai: 0, cdd: 0 };
      if (e.status === "essai") acc.essai++; else acc.actifs++;
      if (e.contract_type === "CDD") acc.cdd++;
      parDep.set(nom, acc);
    }
    const lignes = [...parDep.entries()]
      .map(([departement, v]) => ({ departement, ...v }))
      .sort((a, b) => a.departement.localeCompare(b.departement));
    contenu = xlsx
      ? await xlsxEtatEffectifs(entreprise, lignes, auteur)
      : await etatEffectifs(entreprise, lignes);
  }

  // ----- Synthèse masse salariale annuelle (PDF) -----
  else if (type === "synthese_masse_salariale") {
    const annee = Number(url.searchParams.get("annee") ?? new Date().getFullYear());
    periode = String(annee);
    nomFichier = `synthese_masse_salariale_${annee}`;
    const [{ data: runs }, { data: slips }] = await Promise.all([
      sb.from("payroll_runs").select("id, period_year, period_month").eq("period_year", annee).order("period_month"),
      sb.from("payslips").select("payroll_run_id, gross, cnss_employer, vf, cfpa, net_pay"),
    ]);
    if (!runs || runs.length === 0) return erreur(`Aucune paie générée pour l'année ${annee}.`, 404);
    const periodes = runs.map((r) => {
      const l = (slips ?? []).filter((s) => s.payroll_run_id === r.id);
      return {
        periode: `${MOIS[r.period_month]} ${r.period_year}`,
        effectif: l.length,
        brut: l.reduce((s, x) => s + x.gross, 0),
        chargesPat: l.reduce((s, x) => s + x.cnss_employer + x.vf + x.cfpa, 0),
        net: l.reduce((s, x) => s + x.net_pay, 0),
      };
    });
    contenu = xlsx
      ? await xlsxSyntheseMasseSalariale(entreprise, annee, periodes, auteur)
      : await syntheseMasseSalariale(entreprise, annee, periodes);
  }

  // ----- État des contrats à échéance (PDF, fenêtre J-30) -----
  else if (type === "contrats_echeance") {
    const { data: emps } = await sb.from("employees")
      .select("matricule, first_name, last_name, status, contract_type, contract_end_date, trial_end_date, id_doc_expiry")
      .neq("status", "sorti");
    const maintenant = new Date();
    const j30 = new Date(maintenant.getTime() + 30 * 86400e3);
    const jours = (d: string) => Math.round((new Date(d).getTime() - maintenant.getTime()) / 86400e3);
    const lignes: { matricule: string; nom: string; type: string; echeance: string; jours: number }[] = [];
    for (const e of emps ?? []) {
      const nom = `${e.last_name.toUpperCase()} ${e.first_name}`;
      if (e.contract_type === "CDD" && e.contract_end_date && new Date(e.contract_end_date) <= j30)
        lignes.push({ matricule: e.matricule, nom, type: "Fin de CDD", echeance: e.contract_end_date, jours: jours(e.contract_end_date) });
      if (e.status === "essai" && e.trial_end_date && new Date(e.trial_end_date) <= j30)
        lignes.push({ matricule: e.matricule, nom, type: "Fin de période d'essai", echeance: e.trial_end_date, jours: jours(e.trial_end_date) });
      if (e.id_doc_expiry && new Date(e.id_doc_expiry) <= j30)
        lignes.push({ matricule: e.matricule, nom, type: "Pièce d'identité à renouveler", echeance: e.id_doc_expiry, jours: jours(e.id_doc_expiry) });
    }
    lignes.sort((a, b) => a.jours - b.jours);
    contenu = xlsx
      ? await xlsxEtatContratsEcheance(entreprise, lignes, auteur)
      : await etatContratsEcheance(entreprise, lignes);
  }

  else {
    // suivi_conges
    const annee = 2026;
    periode = String(annee);
    const { data: balances } = await sb.from("leave_balances")
      .select("entitled_days, seniority_bonus_days, carryover_days, taken_days, employees(matricule, first_name, last_name, hire_date)")
      .eq("year", annee);
    if (!balances || balances.length === 0) return erreur("Aucun solde de congés visible.", 404);
    const lignes = balances
      .map((b) => {
        const emp = b.employees as unknown as { matricule: string; first_name: string; last_name: string; hire_date: string } | null;
        return {
          matricule: emp?.matricule ?? "—",
          nom: emp ? `${emp.last_name} ${emp.first_name}` : "—",
          embauche: emp?.hire_date ?? "",
          acquis: b.entitled_days, anciennete: b.seniority_bonus_days,
          report: b.carryover_days, pris: b.taken_days,
        };
      })
      .sort((a, b) => a.matricule.localeCompare(b.matricule));
    contenu = xlsx
      ? await xlsxSuiviConges(entreprise, annee, lignes, auteur)
      : await suiviConges(entreprise, annee, lignes);
  }

  // ----- Archivage des métadonnées (au mieux : la RLS peut refuser selon le rôle) -----
  await sb.from("documents").insert({
    company_id: profil!.company_id,
    employee_id: employeeId ?? null,
    doc_type: type,
    category: ["journal_paie", "etat_rts", "declaration_cnss", "etat_salaires", "synthese_masse_salariale"].includes(type) ? "paie"
      : ["registre_personnel", "suivi_conges"].includes(type) ? "legal" : "rh",
    title: TITRES[type],
    period: periode,
    generated_by: user.id,
  });

  return reponseFichier(contenu, nomFichier, xlsx);
}
