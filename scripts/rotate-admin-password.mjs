// Rotation du mot de passe super-admin : génère un secret fort, l'applique
// via l'API admin Supabase, et met à jour ADMIN_PASSWORD dans .env.local.
// Usage : node scripts/rotate-admin-password.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const envPath = ".env.local";
const envRaw = readFileSync(envPath, "utf8");
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m) process.env[m[1]] = m[2]; // dernier gagne (comme dotenvx)
}

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.ADMIN_EMAIL;
if (!URL_SB || !SVC || !EMAIL) throw new Error("Variables manquantes dans .env.local");

// Mot de passe fort : 24 caractères alphanumériques + symboles sûrs
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!#%+=@";
const nouveau = Array.from(randomBytes(24), (b) => alphabet[b % alphabet.length]).join("");

// Retrouver l'utilisateur
const liste = await fetch(`${URL_SB}/auth/v1/admin/users?per_page=100`, {
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
}).then((r) => r.json());
const user = (liste.users ?? []).find((u) => u.email === EMAIL);
if (!user) throw new Error(`Compte ${EMAIL} introuvable`);

// Appliquer le nouveau mot de passe
const res = await fetch(`${URL_SB}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
  body: JSON.stringify({ password: nouveau }),
});
if (!res.ok) throw new Error(`Échec de la rotation : ${await res.text()}`);

// Mettre à jour .env.local (toutes les occurrences d'ADMIN_PASSWORD)
const maj = envRaw.replace(/^(ADMIN_PASSWORD=).*$/gm, `$1${nouveau}`);
writeFileSync(envPath, maj);

// Vérifier la connexion réelle avec le nouveau mot de passe
const test = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  body: JSON.stringify({ email: EMAIL, password: nouveau }),
}).then((r) => r.json());
if (!test.access_token) throw new Error("Le nouveau mot de passe ne fonctionne pas !");

console.log(`✓ Mot de passe de ${EMAIL} tourné et vérifié (connexion réelle OK).`);
console.log("✓ .env.local mis à jour — le nouveau mot de passe n'apparaît nulle part ailleurs.");
console.log("  → Consultez-le dans .env.local (ADMIN_PASSWORD) et stockez-le dans votre coffre.");
