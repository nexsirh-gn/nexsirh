/**
 * Tests d'isolation multi-tenant (CLAUDE.md §5, étape G).
 * Une entreprise A ne voit/modifie JAMAIS les données d'une entreprise B,
 * et chaque rôle respecte la matrice des droits (§7.1 du plan) :
 *   - manager : son équipe uniquement, JAMAIS les salaires
 *   - comptable : paie en lecture seule
 *   - employé : ses propres lignes uniquement
 * Cette suite doit être verte avant tout merge (interdit absolu #8).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "Test1234!";

function anonClient() {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}
async function loginAs(email: string): Promise<SupabaseClient> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Connexion ${email} : ${error.message}`);
  return c;
}

let garayaId: string;
let injelecId: string;

beforeAll(async () => {
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data } = await svc.from("companies").select("id, name").in("name", ["GARAYA HOLDING", "INJELEC-GUINÉE"]);
  garayaId = data!.find((c) => c.name === "GARAYA HOLDING")!.id;
  injelecId = data!.find((c) => c.name === "INJELEC-GUINÉE")!.id;
});

describe("Étanchéité inter-entreprises", () => {
  it("anonyme (non connecté) : aucune donnée accessible", async () => {
    const c = anonClient();
    const { data } = await c.from("employees").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("admin GARAYA ne voit pas l'entreprise INJELEC ni ses salariés", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: comps } = await c.from("companies").select("id");
    expect(comps!.map((x) => x.id)).not.toContain(injelecId);
    const { data: emps } = await c.from("employees").select("company_id");
    expect(emps!.every((e) => e.company_id === garayaId)).toBe(true);
  });

  it("admin INJELEC ne voit aucun salarié GARAYA (lecture)", async () => {
    const c = await loginAs("admin@injelec.gn");
    const { data } = await c.from("employees").select("company_id");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((e) => e.company_id === injelecId)).toBe(true);
  });

  it("admin INJELEC ne peut pas ÉCRIRE chez GARAYA (insert rejeté)", async () => {
    const c = await loginAs("admin@injelec.gn");
    const { error } = await c.from("departments").insert({
      company_id: garayaId, code: "HACK", name: "Intrusion",
    });
    expect(error).not.toBeNull();
  });

  it("admin INJELEC ne peut pas modifier l'entreprise GARAYA (update sans effet)", async () => {
    const c = await loginAs("admin@injelec.gn");
    const { data } = await c.from("companies").update({ name: "PIRATÉ" }).eq("id", garayaId).select();
    expect(data ?? []).toHaveLength(0);
  });

  it("admin INJELEC ne voit aucun bulletin GARAYA", async () => {
    const c = await loginAs("admin@injelec.gn");
    const { data } = await c.from("payslips").select("company_id");
    expect(data!.every((p) => p.company_id === injelecId)).toBe(true);
  });
});

describe("Rôle MANAGER (PLEGNEMOU) — équipe oui, salaires JAMAIS", () => {
  it("ne voit que son équipe (+ lui-même)", async () => {
    const c = await loginAs("g.plegnemou@garaya.gn");
    const { data } = await c.from("employees").select("matricule");
    const mats = data!.map((e) => e.matricule).sort();
    // Son équipe : FAYE, TRAORE, SYLLA, CONTE + lui-même — jamais CAMARA/BARRY (équipe DRH)
    expect(mats).toContain("EMP-002");
    expect(mats).toContain("EMP-009");
    expect(mats).not.toContain("EMP-007");
    expect(mats).not.toContain("EMP-008");
  });

  it("JAMAIS les salaires de son équipe (seulement le sien, en tant que salarié)", async () => {
    const c = await loginAs("g.plegnemou@garaya.gn");
    const { data } = await c.from("employee_compensation").select("base_salary");
    // Il est aussi salarié (EMP-009) : il voit SA ligne, et uniquement la sienne
    expect(data).toHaveLength(1);
    expect(data![0].base_salary).toBe(3_500_000);
  });

  it("JAMAIS les bulletins de son équipe (seulement les siens)", async () => {
    const c = await loginAs("g.plegnemou@garaya.gn");
    const { data } = await c.from("payslips").select("matricule");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((p) => p.matricule === "EMP-009")).toBe(true);
  });
});

describe("Rôle EMPLOYÉ (CAMARA) — ses propres lignes uniquement", () => {
  it("ne voit que sa fiche salarié", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data } = await c.from("employees").select("matricule");
    expect(data!.map((e) => e.matricule)).toEqual(["EMP-007"]);
  });

  it("ne voit que SES bulletins", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data } = await c.from("payslips").select("matricule");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((p) => p.matricule === "EMP-007")).toBe(true);
  });

  it("ne voit que SA rémunération", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data } = await c.from("employee_compensation").select("base_salary");
    expect(data).toHaveLength(1);
    expect(data![0].base_salary).toBe(1_600_000);
  });

  it("ne peut pas approuver un congé (update sans effet)", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: demandes } = await c.from("leave_requests").select("id").eq("status", "attente_rh");
    if (demandes && demandes.length > 0) {
      const { data } = await c.from("leave_requests")
        .update({ status: "approuve" }).eq("id", demandes[0].id).select();
      expect(data ?? []).toHaveLength(0);
    }
  });
});

describe("Rôle COMPTABLE (FAYE) — paie en lecture seule", () => {
  it("lit tous les bulletins de la société", async () => {
    const c = await loginAs("faye.a@garaya.gn");
    const { data } = await c.from("payslips").select("id");
    expect(data!.length).toBeGreaterThanOrEqual(16); // 8 juin + 8 juillet
  });

  it("ne peut PAS modifier un bulletin (update sans effet)", async () => {
    const c = await loginAs("faye.a@garaya.gn");
    const { data: slips } = await c.from("payslips").select("id, net_pay").limit(1);
    const { data } = await c.from("payslips")
      .update({ net_pay: 999 }).eq("id", slips![0].id).select();
    expect(data ?? []).toHaveLength(0);
  });
});

describe("Verrou de clôture (trigger SQL) + audit", () => {
  it("un bulletin d'une période CLÔTURÉE est immuable, même pour l'admin RH", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: run } = await c.from("payroll_runs").select("id").eq("status", "cloture").limit(1).single();
    const { data: slip } = await c.from("payslips").select("id").eq("payroll_run_id", run!.id).limit(1).single();
    const { error } = await c.from("payslips").update({ net_pay: 1 }).eq("id", slip!.id);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/clôturé/i);
  });

  it("le journal d'audit est append-only (update rejeté)", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: rows } = await c.from("audit_log").select("id").limit(1);
    if (rows && rows.length > 0) {
      const { data, error } = await c.from("audit_log")
        .update({ action: "falsifié" }).eq("id", rows[0].id).select();
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });
});

describe("Barèmes légaux — lecture partagée, écriture super_admin uniquement", () => {
  it("un admin d'entreprise LIT le barème RTS", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data } = await c.from("tax_brackets").select("rate");
    expect(data!.length).toBeGreaterThanOrEqual(5);
  });

  it("un admin d'entreprise ne peut PAS modifier le barème", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data } = await c.from("tax_brackets").update({ rate: 0.99 }).eq("rate", 0.05).select();
    expect(data ?? []).toHaveLength(0);
  });
});

/**
 * Non-régressions de l'audit de sécurité du 30/10/2026
 * (migration 20261030090001_rls_durcissement).
 */
describe("Élévation de privilège — un salarié ne se promeut jamais", () => {
  it("CAMARA ne peut pas passer son propre rôle à admin", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: { user } } = await c.auth.getUser();
    const { error } = await c.from("profiles").update({ role: "admin" }).eq("id", user!.id);
    expect(error).not.toBeNull();
    const { data } = await c.from("profiles").select("role").eq("id", user!.id).single();
    expect(data!.role).toBe("employe");
  });

  it("CAMARA ne peut pas passer son propre rôle à super_admin", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: { user } } = await c.auth.getUser();
    const { error } = await c.from("profiles")
      .update({ role: "super_admin", company_id: null }).eq("id", user!.id);
    expect(error).not.toBeNull();
  });

  it("CAMARA ne peut pas se rattacher à une autre entreprise", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: { user } } = await c.auth.getUser();
    const { error } = await c.from("profiles").update({ company_id: injelecId }).eq("id", user!.id);
    expect(error).not.toBeNull();
  });

  it("CAMARA ne peut pas se rattacher au dossier salarié d'un collègue", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: autre } = await c.from("employees").select("id").eq("matricule", "EMP-009").single();
    const emp = await loginAs("b.camara@garaya.gn");
    const { data: { user } } = await emp.auth.getUser();
    const { error } = await emp.from("profiles").update({ employee_id: autre!.id }).eq("id", user!.id);
    expect(error).not.toBeNull();
  });
});

describe("Évasion de tenant par UPDATE (WITH CHECK)", () => {
  it("l'admin GARAYA ne peut pas déplacer un département chez INJELEC", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: dep } = await c.from("departments").select("id").limit(1).single();
    const { data, error } = await c.from("departments")
      .update({ company_id: injelecId }).eq("id", dep!.id).select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("l'admin GARAYA ne peut pas déplacer un salarié chez INJELEC", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: emp } = await c.from("employees").select("id").limit(1).single();
    const { data, error } = await c.from("employees")
      .update({ company_id: injelecId }).eq("id", emp!.id).select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("l'admin GARAYA ne peut pas renuméroter un matricule", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: emp } = await c.from("employees").select("id").eq("matricule", "EMP-007").single();
    const { error } = await c.from("employees").update({ matricule: "EMP-999" }).eq("id", emp!.id);
    expect(error).not.toBeNull();
  });

  it("l'admin GARAYA ne peut pas toucher au statut d'abonnement (champ plateforme)", async () => {
    const c = await loginAs("m.tolno@garaya.gn");
    const { data: avant } = await c.from("companies").select("status").eq("id", garayaId).single();
    // Un statut forcément DIFFÉRENT de l'actuel : un UPDATE qui ne change rien
    // ne déclenche pas le garde (et n'a d'ailleurs rien à interdire).
    const cible = avant!.status === "active" ? "read_only" : "active";

    const { error } = await c.from("companies").update({ status: cible }).eq("id", garayaId);
    expect(error).not.toBeNull();

    const { error: eMotif } = await c.from("companies")
      .update({ suspension_reason: "levée par le client" }).eq("id", garayaId);
    expect(eMotif).not.toBeNull();

    const { data: apres } = await c.from("companies").select("status, suspension_reason").eq("id", garayaId).single();
    expect(apres!.status).toBe(avant!.status);
    expect(apres!.suspension_reason).toBeNull();
  });

  it("l'admin INJELEC ne peut pas générer un matricule chez GARAYA", async () => {
    const c = await loginAs("admin@injelec.gn");
    const { error } = await c.rpc("next_matricule", { p_company: garayaId });
    expect(error).not.toBeNull();
  });
});

describe("Workflow de congés — non contournable par le salarié", () => {
  it("CAMARA ne peut pas créer une demande déjà approuvée", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: emp } = await c.from("employees").select("id, company_id").single();
    const { error } = await c.from("leave_requests").insert({
      company_id: emp!.company_id, employee_id: emp!.id, leave_type_code: "CA",
      start_date: "2026-12-01", end_date: "2026-12-03", working_days: 3,
      status: "approuve",
    });
    expect(error).not.toBeNull();
  });

  it("CAMARA ne peut pas approuver sa propre demande en attente", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: emp } = await c.from("employees").select("id, company_id").single();
    const { data: dem, error: eIns } = await c.from("leave_requests").insert({
      company_id: emp!.company_id, employee_id: emp!.id, leave_type_code: "CA",
      start_date: "2026-12-10", end_date: "2026-12-11", working_days: 2,
      status: "attente_manager",
    }).select("id").single();
    expect(eIns).toBeNull();

    const { data: up } = await c.from("leave_requests")
      .update({ status: "approuve" }).eq("id", dem!.id).select();
    expect(up ?? []).toHaveLength(0);

    // l'annulation, elle, reste permise
    const { data: annul } = await c.from("leave_requests")
      .update({ status: "annule" }).eq("id", dem!.id).select();
    expect(annul).toHaveLength(1);

    // La suite doit être rejouable : on retire la demande créée pour le test
    // (aucun rôle client ne peut supprimer une demande — service_role requis).
    const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
    await svc.from("leave_requests").delete().eq("id", dem!.id);
  });

  it("un salarié ne peut pas déposer une demande au nom d'un collègue", async () => {
    const rh = await loginAs("m.tolno@garaya.gn");
    const { data: autre } = await rh.from("employees").select("id, company_id").eq("matricule", "EMP-009").single();
    const c = await loginAs("b.camara@garaya.gn");
    const { error } = await c.from("leave_requests").insert({
      company_id: autre!.company_id, employee_id: autre!.id, leave_type_code: "CA",
      start_date: "2026-12-15", end_date: "2026-12-16", working_days: 2,
      status: "attente_manager",
    });
    expect(error).not.toBeNull();
  });
});

describe("Pointages (timesheet_entries) — plus de lecture ouverte au tenant", () => {
  it("CAMARA ne voit aucun pointage qui ne soit pas le sien", async () => {
    const c = await loginAs("b.camara@garaya.gn");
    const { data: mesFeuilles } = await c.from("timesheets").select("id");
    const miennes = new Set((mesFeuilles ?? []).map((t) => t.id));
    const { data: entries } = await c.from("timesheet_entries").select("timesheet_id");
    expect((entries ?? []).every((e) => miennes.has(e.timesheet_id))).toBe(true);
  });

  it("le manager PLEGNEMOU ne voit pas les pointages hors de son équipe", async () => {
    const c = await loginAs("g.plegnemou@garaya.gn");
    const { data: visibles } = await c.from("timesheets").select("id");
    const autorisees = new Set((visibles ?? []).map((t) => t.id));
    const { data: entries } = await c.from("timesheet_entries").select("timesheet_id");
    expect((entries ?? []).every((e) => autorisees.has(e.timesheet_id))).toBe(true);
  });
});
