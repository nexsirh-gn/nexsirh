/**
 * Création du compte super-admin de la console — IDEMPOTENT.
 * Identifiants lus depuis .env.local (ADMIN_EMAIL / ADMIN_PASSWORD) :
 * jamais en dur dans le code, les migrations ou les seeds.
 *
 * Usage : npx tsx scripts/create-super-admin.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceKey) throw new Error("Variables Supabase manquantes dans .env.local");
if (!email || !password) throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD manquants dans .env.local");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Idempotence : le compte existe-t-il déjà ?
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    console.log(`OK — le compte super-admin ${email} existe déjà (profil ${existing.id}), rien à faire.`);
    return;
  }

  let userId: string;
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pas d'email de confirmation à attendre
  });
  if (error) {
    // Le compte auth existe déjà (ex. profil purgé) : on le retrouve
    const { data: list } = await supabase.auth.admin.listUsers();
    const found = list?.users.find((u) => u.email === email);
    if (!found) throw error;
    userId = found.id;
  } else {
    userId = created.user.id;
  }

  const { error: pErr } = await supabase.from("profiles").insert({
    id: userId,
    company_id: null,
    role: "super_admin",
    full_name: "Super Admin",
    email,
  });
  if (pErr) throw pErr;

  await supabase.from("admin_team_members").insert({
    profile_id: userId,
    name: "Super Admin",
    email,
    console_role: "super_admin",
    twofa_enabled: true,
  });

  console.log(`OK — compte super-admin créé : ${email} (auth ${userId})`);
  console.log("ATTENTION : ce mot de passe a transité en clair — prévoir sa rotation avant la production.");
}

main().catch((e) => {
  console.error("Échec :", e.message ?? e);
  process.exit(1);
});
