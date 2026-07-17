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
