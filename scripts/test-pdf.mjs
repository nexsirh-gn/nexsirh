// Test de bout en bout du téléchargement de bulletin PDF :
// connexion réelle (cookies de session) puis GET /api/documents/bulletin/[id]
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP = "http://localhost:3000";

// 1. Connexion (API GoTrue directe pour récupérer les tokens)
const auth = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON },
  body: JSON.stringify({ email: "b.camara@garaya.gn", password: "Test1234!" }),
}).then((r) => r.json());
if (!auth.access_token) { console.error("Connexion échouée :", auth); process.exit(1); }
console.log("1. Connexion CAMARA (employée) OK");

// 2. Récupérer un de SES bulletins (RLS)
const slips = await fetch(`${URL_SB}/rest/v1/payslips?select=id,matricule&limit=1`, {
  headers: { apikey: ANON, Authorization: `Bearer ${auth.access_token}` },
}).then((r) => r.json());
if (!slips[0]) { console.error("Aucun bulletin visible"); process.exit(1); }
console.log(`2. Bulletin visible via RLS : ${slips[0].matricule} (${slips[0].id.slice(0, 8)}…)`);

// 3. Cookie de session au format @supabase/ssr (base64url du JSON de session)
const ref = new URL(URL_SB).hostname.split(".")[0];
const sessionJson = JSON.stringify(auth);
const cookieVal = "base64-" + Buffer.from(sessionJson).toString("base64url");
// découpage en chunks comme le fait @supabase/ssr (max ~3180 chars/cookie)
const chunks = cookieVal.match(/.{1,3180}/g);
const cookie = chunks.length === 1
  ? `sb-${ref}-auth-token=${chunks[0]}`
  : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; ");

// 4. Télécharger le PDF via la route Next.js
const res = await fetch(`${APP}/api/documents/bulletin/${slips[0].id}`, {
  headers: { Cookie: cookie },
});
console.log(`3. GET /api/documents/bulletin → HTTP ${res.status} · ${res.headers.get("content-type")}`);
if (res.status !== 200) { console.error(await res.text()); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
const estPdf = buf.subarray(0, 5).toString() === "%PDF-";
console.log(`4. Contenu : ${buf.length} octets · signature PDF : ${estPdf ? "OK" : "INVALIDE"}`);
writeFileSync("scripts/_test-bulletin.pdf", buf);
console.log("5. Écrit dans scripts/_test-bulletin.pdf pour contrôle visuel");

// 5. Contrôle d'accès : CAMARA ne doit PAS télécharger le bulletin d'un autre
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const autres = await fetch(`${URL_SB}/rest/v1/payslips?select=id&matricule=eq.EMP-002&limit=1`, {
  headers: { apikey: svc, Authorization: `Bearer ${svc}` },
}).then((r) => r.json());
const interdit = await fetch(`${APP}/api/documents/bulletin/${autres[0].id}`, { headers: { Cookie: cookie } });
console.log(`6. Bulletin d'un AUTRE salarié (FAYE) → HTTP ${interdit.status} ${interdit.status === 404 ? "(refusé par la RLS ✓)" : "⚠ PROBLÈME"}`);
process.exit(estPdf && interdit.status === 404 ? 0 : 1);
