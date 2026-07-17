// Applique les migrations SQL sur le projet Supabase distant via l'API Management.
// Usage : node scripts/db-apply.mjs [fichier.sql ...]   (sans argument : toutes les migrations)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Chargement minimal de .env.local (pas de dépendance dotenv)
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (!TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN manquant dans .env.local");

async function runSql(label, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`✗ ${label} — HTTP ${res.status}`);
    console.error(body.slice(0, 2000));
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()
      .map((f) => join("supabase/migrations", f));

for (const f of files) {
  await runSql(f, readFileSync(f, "utf8"));
}
console.log("Terminé.");
