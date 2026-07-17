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
