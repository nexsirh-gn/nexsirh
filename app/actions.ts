"use server";

/**
 * Server Actions — toutes les écritures passent ici (session utilisateur,
 * la RLS fait autorité ; aucune donnée simulée).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

function err(e: { message?: string } | string): Result {
  return { ok: false, error: typeof e === "string" ? e : e.message ?? "Erreur inconnue" };
}

/** Congés : décision manager ou RH (motif obligatoire au refus — contrainte SQL) */
export async function deciderConge(
  id: string,
  decision: "approuver" | "refuser",
  motif?: string
): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.id).single();
  const { data: demande } = await sb.from("leave_requests").select("status").eq("id", id).single();
  if (!demande) return err("Demande introuvable");

  const estRH = profil?.role === "admin" || profil?.role === "rh";
  const patch: Record<string, unknown> =
    decision === "refuser"
      ? { status: "refuse", refusal_reason: motif || "Refusée", ...(estRH ? { rh_decision_by: user.id, rh_decision_at: new Date().toISOString() } : { manager_decision_by: user.id, manager_decision_at: new Date().toISOString() }) }
      : estRH
        ? { status: "approuve", rh_decision_by: user.id, rh_decision_at: new Date().toISOString() }
        : { status: "attente_rh", manager_decision_by: user.id, manager_decision_at: new Date().toISOString() };

  const { error } = await sb.from("leave_requests").update(patch).eq("id", id);
  if (error) return err(error);
  revalidatePath("/conges");
  return { ok: true };
}

/** Congés : nouvelle demande */
export async function demanderConge(input: {
  employeeId: string;
  typeCode: string;
  du: string;
  au: string;
  jours: number;
  commentaire?: string;
}): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { data: profil } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  const { error } = await sb.from("leave_requests").insert({
    company_id: profil!.company_id,
    employee_id: input.employeeId,
    leave_type_code: input.typeCode,
    start_date: input.du,
    end_date: input.au,
    working_days: input.jours,
    comment: input.commentaire ?? null,
    status: "attente_manager",
  });
  if (error) return err(error);
  revalidatePath("/conges");
  revalidatePath("/portail/mes-conges");
  return { ok: true };
}

/** Paie : clôturer la période (montants figés, trigger SQL verrouille les bulletins) */
export async function cloturerPaie(runId: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("close_payroll_run", { p_run: runId });
  if (error) return err(error);
  revalidatePath("/paie");
  return { ok: true };
}

/**
 * Paie — les trois opérations du cycle délèguent à lib/paie/generation
 * (orchestration partagée avec les tests E2E, toujours sous RLS).
 */
async function contexteRH() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const { data: profil } = await sb.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!["admin", "rh"].includes(profil?.role ?? "")) throw new Error("Réservé aux rôles RH/Admin.");
  return { sb, userId: user.id, companyId: profil!.company_id as string };
}

/** Générer le cycle d'un mois (bulletins calculés par lib/paie, barème via getBaremeAt) */
export async function genererPaie(year: number, month: number): Promise<Result & { nb?: number }> {
  try {
    const { genererPaieDB } = await import("@/lib/paie/generation");
    const { sb, userId, companyId } = await contexteRH();
    const nb = await genererPaieDB(sb, companyId, userId, year, month);
    revalidatePath("/paie");
    return { ok: true, nb };
  } catch (e) {
    return err(e as Error);
  }
}

/** Recalculer une période en brouillon — les saisies manuelles survivent (§6.6) */
export async function recalculerPaie(runId: string): Promise<Result & { nb?: number }> {
  try {
    const { recalculerPaieDB } = await import("@/lib/paie/generation");
    const { sb, companyId } = await contexteRH();
    const nb = await recalculerPaieDB(sb, companyId, runId);
    revalidatePath("/paie");
    return { ok: true, nb };
  } catch (e) {
    return err(e as Error);
  }
}

/** Ajustement manuel (retenue/reprise ou rappel) — bulletin recalculé, net négatif bloqué (§6.7) */
export async function ajouterAjustement(
  payslipId: string,
  type: "retenue" | "rappel",
  libelle: string,
  montant: number
): Promise<Result> {
  try {
    const { ajouterAjustementDB } = await import("@/lib/paie/generation");
    const { sb, companyId } = await contexteRH();
    await ajouterAjustementDB(sb, companyId, payslipId, type, libelle, montant);
    revalidatePath("/paie");
    return { ok: true };
  } catch (e) {
    return err(e as Error);
  }
}


/** Paie : supprimer une période en brouillon (autorisé par la maquette et §6.6) */
export async function supprimerPaie(runId: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("payroll_runs").delete().eq("id", runId).eq("status", "brouillon");
  if (error) return err(error);
  revalidatePath("/paie");
  return { ok: true };
}

/** Création d'un employé (matricule généré côté serveur, rémunération liée) */
export async function creerEmploye(input: {
  civility: string; last_name: string; first_name: string;
  birth_date: string; birth_place?: string; nationality?: string;
  marital_status?: string; children_count?: number;
  address?: string; phone?: string; email?: string;
  emergency_contact_name?: string; emergency_contact_phone?: string;
  department_id?: string; position_id?: string; manager_id?: string;
  contract_type: string; hire_date: string; contract_end_date?: string;
  trial_end_date?: string; category?: string; cnss_number?: string;
  bank_name?: string; bank_account?: string; payment_mode?: string;
  base_salary: number; seniority_bonus?: number; meal_allowance?: number;
  housing_allowance?: number; transport_allowance?: number;
  cost_of_living_allowance?: number;
}): Promise<Result & { matricule?: string }> {
  try {
    const { sb, userId, companyId } = await contexteRH();
    if (!input.last_name?.trim() || !input.first_name?.trim() || !input.birth_date || !input.hire_date) {
      return err("Nom, prénom, date de naissance et date d'embauche obligatoires.");
    }
    if (!Number.isFinite(input.base_salary) || input.base_salary <= 0) {
      return err("Salaire de base obligatoire (entier GNF positif).");
    }
    // Matricule EMP-XXX généré côté serveur, unique par entreprise, non modifiable
    const { data: matricule, error: eMat } = await sb.rpc("next_matricule", { p_company: companyId });
    if (eMat) return err(eMat);

    const { data: emp, error: eEmp } = await sb.from("employees").insert({
      company_id: companyId, matricule,
      civility: input.civility || "M.",
      last_name: input.last_name.trim().toUpperCase(),
      first_name: input.first_name.trim(),
      birth_date: input.birth_date, birth_place: input.birth_place || null,
      nationality: input.nationality || "Guinéenne",
      marital_status: input.marital_status || null,
      children_count: input.children_count ?? 0,
      address: input.address || null, phone: input.phone || null, email: input.email || null,
      emergency_contact_name: input.emergency_contact_name || null,
      emergency_contact_phone: input.emergency_contact_phone || null,
      department_id: input.department_id || null, position_id: input.position_id || null,
      manager_id: input.manager_id || null,
      contract_type: input.contract_type, hire_date: input.hire_date,
      contract_end_date: input.contract_end_date || null,
      trial_end_date: input.trial_end_date || null,
      category: input.category || "Employé", cnss_number: input.cnss_number || null,
      bank_name: input.bank_name || null, bank_account: input.bank_account || null,
      payment_mode: input.payment_mode || "Virement",
      status: input.trial_end_date ? "essai" : "actif",
    }).select("id").single();
    if (eEmp) {
      // Contraintes SQL lisibles (âge ≥ 16, CDD ≤ 24 mois, date fin CDD)
      if (eEmp.message.includes("age_minimum")) return err("Âge minimum : 16 ans à l'embauche (Code du travail).");
      if (eEmp.message.includes("cdd_24_mois")) return err("Un CDD ne peut pas dépasser 24 mois.");
      if (eEmp.message.includes("cdd_date_fin")) return err("Date de fin obligatoire pour un CDD.");
      return err(eEmp);
    }
    const { error: eComp } = await sb.from("employee_compensation").insert({
      employee_id: emp.id, company_id: companyId,
      base_salary: Math.round(input.base_salary),
      seniority_bonus: Math.round(input.seniority_bonus ?? 0),
      meal_allowance: Math.round(input.meal_allowance ?? 0),
      housing_allowance: Math.round(input.housing_allowance ?? 0),
      transport_allowance: Math.round(input.transport_allowance ?? 0),
      cost_of_living_allowance: Math.round(input.cost_of_living_allowance ?? 0),
    });
    if (eComp) return err(eComp);
    await sb.from("employee_movements").insert({
      company_id: companyId, employee_id: emp.id, movement_type: "embauche",
      reason: `Embauche ${input.contract_type}`, effective_date: input.hire_date, created_by: userId,
    });
    revalidatePath("/employes");
    return { ok: true, matricule: matricule as string };
  } catch (e) {
    return err(e as Error);
  }
}

/** Modification de la fiche (hors salaire — le salaire passe par un mouvement) */
export async function modifierEmploye(
  employeeId: string,
  champs: Record<string, string | number | null>
): Promise<Result> {
  try {
    const { sb } = await contexteRH();
    // Poste, département, catégorie, salaire : jamais ici → mouvement journalisé (§10.5).
    const AUTORISES = ["civility", "marital_status", "last_name", "first_name", "phone", "email",
      "address", "payment_mode", "bank_name", "bank_account",
      "emergency_contact_name", "emergency_contact_phone", "cnss_number",
      "nationality", "birth_place", "id_doc_type", "id_doc_number", "id_doc_expiry", "children_count"];
    const patch = Object.fromEntries(Object.entries(champs).filter(([k]) => AUTORISES.includes(k)));
    if (Object.keys(patch).length === 0) return err("Aucun champ modifiable fourni.");
    // children_count est un entier ; les selects/inputs renvoient des strings
    if ("children_count" in patch) {
      const n = parseInt(String(patch.children_count), 10);
      if (!Number.isFinite(n) || n < 0) return err("Nombre d'enfants invalide.");
      patch.children_count = n;
    }
    // id_doc_expiry : chaîne vide → null (colonne date)
    if (patch.id_doc_expiry === "") patch.id_doc_expiry = null;
    const { error } = await sb.from("employees").update(patch).eq("id", employeeId);
    if (error) return err(error);
    revalidatePath("/employes");
    return { ok: true };
  } catch (e) {
    return err(e as Error);
  }
}

/** Mouvement de carrière (jamais d'UPDATE direct du salaire — trigger applique) */
export async function creerMouvement(input: {
  employeeId: string;
  type: string;
  ancienne?: string;
  nouvelle?: string;
  motif: string;
  dateEffet: string;
}): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { data: profil } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  const { error } = await sb.from("employee_movements").insert({
    company_id: profil!.company_id,
    employee_id: input.employeeId,
    movement_type: input.type,
    field_changed: input.type === "augmentation" ? "base_salary" : null,
    old_value: input.ancienne ?? null,
    new_value: input.nouvelle ?? null,
    reason: input.motif,
    effective_date: input.dateEffet,
    created_by: user.id,
  });
  if (error) return err(error);
  revalidatePath("/employes");
  return { ok: true };
}

/** Temps : valider une feuille et la transmettre à la paie */
export async function validerFeuilleTemps(timesheetId: string): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb
    .from("timesheets")
    .update({ status: "valide", validated_by: user?.id })
    .eq("id", timesheetId);
  if (error) return err(error);
  revalidatePath("/temps");
  return { ok: true };
}

/** Console : suspendre une entreprise (statut, aucune suppression) */
export async function suspendreEntreprise(companyId: string, motif: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb
    .from("companies")
    .update({ status: "suspended", suspension_reason: motif })
    .eq("id", companyId);
  if (error) return err(error);
  revalidatePath("/admin/entreprises");
  return { ok: true };
}

/** Console : accès support (impersonation) — audit des DEUX côtés */
export async function ouvrirAccesSupport(companyId: string, motif: string): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  // Ligne d'audit côté plateforme ET côté client (company_id renseigné)
  const { error } = await sb.rpc("log_support_access", {
    p_company: companyId,
    p_reason: motif,
  });
  if (error) return err(error);
  return { ok: true };
}

/** Documents : enregistrer les métadonnées d'un document généré */
export async function genererDocument(input: {
  docType: string;
  titre: string;
  periode?: string;
  employeeId?: string;
  categorie?: string;
}): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { data: profil } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  const { error } = await sb.from("documents").insert({
    company_id: profil!.company_id,
    employee_id: input.employeeId ?? null,
    doc_type: input.docType,
    category: input.categorie ?? "rh",
    title: input.titre,
    period: input.periode ?? null,
    generated_by: user.id,
  });
  if (error) return err(error);
  revalidatePath("/documents");
  return { ok: true };
}

/** Mon profil (utilisateur connecté) : nom et téléphone sur profiles (RLS : id = auth.uid()) */
export async function mettreAJourMonProfil(input: { fullName: string; phone: string }): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { error } = await sb.from("profiles")
    .update({ full_name: input.fullName, phone: input.phone || null })
    .eq("id", user.id);
  if (error) return err(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Mes coordonnées (employé du portail) : passe par la fonction security definer update_my_contact */
export async function mettreAJourMesCoordonnees(input: {
  phone: string; address: string; emergencyName: string; emergencyPhone: string;
}): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { error } = await sb.rpc("update_my_contact", {
    p_phone: input.phone || null,
    p_address: input.address || null,
    p_emergency_contact_name: input.emergencyName || null,
    p_emergency_contact_phone: input.emergencyPhone || null,
  });
  if (error) return err(error);
  revalidatePath("/portail");
  return { ok: true };
}

/**
 * Inviter un utilisateur : crée le compte Auth (service_role, jamais côté
 * client) et le profil correspondant. Email d'invitation Supabase natif
 * (lien de définition de mot de passe) — l'envoi effectif dépend du SMTP
 * configuré sur le projet Supabase (hors périmètre de cette étape).
 */
export async function inviterUtilisateur(input: {
  email: string; fullName: string; role: string; employeeId?: string;
}): Promise<Result> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err("Non connecté");
  const { data: profil } = await sb.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!["admin", "rh"].includes(profil?.role ?? "")) return err("Réservé aux rôles RH/Admin.");
  if (profil?.role === "rh" && input.role === "admin") return err("Le rôle RH ne peut pas créer d'administrateur.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return err("Configuration serveur incomplète (clé service_role manquante).");

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: invite, error: eInvite } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
  });
  if (eInvite || !invite?.user) return err(eInvite?.message ?? "Échec de l'invitation.");

  const { error: eProfil } = await admin.from("profiles").insert({
    id: invite.user.id,
    company_id: profil!.company_id,
    role: input.role,
    employee_id: input.employeeId ?? null,
    full_name: input.fullName,
    email: input.email,
  });
  if (eProfil) {
    await admin.auth.admin.deleteUser(invite.user.id);
    return err(eProfil.message);
  }
  revalidatePath("/parametrage");
  return { ok: true };
}

/** Primes & indemnités : créer / activer-désactiver une ligne de référentiel */
export async function creerPrimeType(input: {
  code: string; name: string; taxableRts: boolean; subjectCnss: boolean;
}): Promise<Result> {
  try {
    const { sb, companyId } = await contexteRH();
    const { error } = await sb.from("premium_types").insert({
      company_id: companyId, code: input.code.toUpperCase(), name: input.name,
      taxable_rts: input.taxableRts, subject_cnss: input.subjectCnss,
    });
    if (error) return err(error);
    revalidatePath("/parametrage");
    return { ok: true };
  } catch (e) { return err(e as Error); }
}

/** Types d'absences : créer une ligne de référentiel */
export async function creerAbsenceType(input: {
  code: string; name: string; paid: boolean; entitlementDays: number | null;
}): Promise<Result> {
  try {
    const { sb, companyId } = await contexteRH();
    const { error } = await sb.from("leave_types").insert({
      company_id: companyId, code: input.code.toUpperCase(), name: input.name,
      paid: input.paid, entitlement_days: input.entitlementDays,
    });
    if (error) return err(error);
    revalidatePath("/parametrage");
    return { ok: true };
  } catch (e) { return err(e as Error); }
}
