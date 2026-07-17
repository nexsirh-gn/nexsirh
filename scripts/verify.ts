/**
 * Vérification finale (checklist §6 du prompt full-stack) :
 *  6. connexion réelle du super-admin
 *  8. cycle d'écriture complet : créer un employé → augmentation (mouvement)
 *     → trigger applique le salaire → lignes d'audit présentes
 * Usage : npx tsx scripts/verify.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let echecs = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  OK " : "ÉCHEC"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) echecs++;
}

async function main() {
  // ----- 6. Connexion réelle super-admin -----
  const admin = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: adminAuth, error: adminErr } = await admin.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
  });
  check("Connexion super-admin (ADMIN_EMAIL/.env.local)", !adminErr && !!adminAuth.user);
  if (adminAuth.user) {
    const { data: p } = await admin.from("profiles").select("role").eq("id", adminAuth.user.id).single();
    check("Rôle super_admin vérifié", p?.role === "super_admin");
    const { data: comps } = await admin.from("companies").select("id");
    check("Console : accès à toutes les entreprises", (comps?.length ?? 0) >= 3, `${comps?.length} entreprises`);
  }

  // ----- 8. Cycle d'écriture complet (en tant qu'admin RH GARAYA) -----
  const rh = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: rhAuth } = await rh.auth.signInWithPassword({ email: "m.tolno@garaya.gn", password: "Test1234!" });
  const { data: profil } = await rh.from("profiles").select("company_id").eq("id", rhAuth.user!.id).single();
  const companyId = profil!.company_id;

  // a) créer un employé (+ rémunération)
  const { data: emp, error: e1 } = await rh.from("employees").insert({
    company_id: companyId, matricule: "EMP-TEST", last_name: "VERIF", first_name: "Cycle",
    birth_date: "1995-01-01", hire_date: "2026-07-01", email: "verif@garaya.gn",
  }).select("id").single();
  check("Créer un employé (insert réel)", !e1 && !!emp, e1?.message);
  if (!emp) return fin();

  const { error: e2 } = await rh.from("employee_compensation").insert({
    employee_id: emp.id, company_id: companyId, base_salary: 2_000_000,
  });
  check("Créer sa rémunération", !e2, e2?.message);

  // b) UPDATE direct du salaire → doit être REJETÉ (pas de policy update)
  const { data: updDirect } = await rh.from("employee_compensation")
    .update({ base_salary: 9_999_999 }).eq("employee_id", emp.id).select();
  check("UPDATE direct du salaire interdit (interdit absolu #5)", (updDirect ?? []).length === 0);

  // c) augmentation via MOUVEMENT → le trigger applique
  const { error: e3 } = await rh.from("employee_movements").insert({
    company_id: companyId, employee_id: emp.id, movement_type: "augmentation",
    field_changed: "base_salary", old_value: "2000000", new_value: "2200000",
    reason: "Test cycle de vérification", effective_date: "2026-08-01",
  });
  check("Mouvement d'augmentation inséré", !e3, e3?.message);
  const { data: comp } = await rh.from("employee_compensation")
    .select("base_salary").eq("employee_id", emp.id).single();
  check("Trigger : salaire répercuté par le mouvement", comp?.base_salary === 2_200_000, `salaire = ${comp?.base_salary}`);

  // d) lignes d'audit présentes
  const { data: audit } = await rh.from("audit_log")
    .select("action").eq("target_table", "employees").eq("target_id", emp.id);
  check("Audit : création de l'employé journalisée", (audit?.length ?? 0) >= 1);

  // e) nettoyage (l'employé de test « sort » — jamais de suppression)
  await rh.from("employee_movements").insert({
    company_id: companyId, employee_id: emp.id, movement_type: "depart",
    reason: "Fin du test de vérification", effective_date: "2026-07-17",
  });
  const { data: sorti } = await rh.from("employees").select("status").eq("id", emp.id).single();
  check("Mouvement de départ : statut « sorti » appliqué", sorti?.status === "sorti");

  fin();
}

function fin() {
  console.log(echecs === 0 ? "\n✓ Vérification complète : tout est vert." : `\n✗ ${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

main();
