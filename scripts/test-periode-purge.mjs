// Tests : bilan social Excel, génération par PÉRIODE (juin vs juillet),
// et purge automatique de l'historique documents à 100 lignes.
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP = "http://localhost:3000";
let echecs = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  OK " : "ÉCHEC"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) echecs++;
};

async function login(email) {
  const auth = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password: "Test1234!" }),
  }).then((r) => r.json());
  const ref = new URL(URL_SB).hostname.split(".")[0];
  const val = "base64-" + Buffer.from(JSON.stringify(auth)).toString("base64url");
  const chunks = val.match(/.{1,3180}/g);
  return {
    cookie: chunks.length === 1 ? `sb-${ref}-auth-token=${chunks[0]}` : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; "),
    token: auth.access_token,
  };
}
const rest = (token, path) =>
  fetch(`${URL_SB}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }).then((r) => r.json());
const restSvc = (path, init = {}) =>
  fetch(`${URL_SB}/rest/v1/${path}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "return=minimal", ...(init.headers ?? {}) } });

const rh = await login("m.tolno@garaya.gn");
console.log("Connexion m.tolno OK\n");

// ===== 1. Bilan social Excel =====
console.log("— 1. Bilan social Excel —");
const bs = await fetch(`${APP}/api/documents/generer?type=bilan_social&format=xlsx&annee=2026`, { headers: { Cookie: rh.cookie } });
const bufBs = Buffer.from(await bs.arrayBuffer());
ok("Bilan social 2026 généré", bs.status === 200 && bufBs.subarray(0, 2).toString() === "PK", `HTTP ${bs.status} · ${bufBs.length} octets`);
writeFileSync("scripts/_bilan.xlsx", bufBs);

// ===== 2. Sélection de période =====
console.log("\n— 2. Génération par période (juin clôturé vs juillet brouillon) —");
const runs = await rest(rh.token, "payroll_runs?select=id,period_month&order=period_month");
for (const r of runs) {
  const res = await fetch(`${APP}/api/documents/generer?type=declaration_cnss&run=${r.id}&format=xlsx`, { headers: { Cookie: rh.cookie } });
  const buf = Buffer.from(await res.arrayBuffer());
  ok(`Déclaration CNSS période ${String(r.period_month).padStart(2, "0")}/2026`, res.status === 200 && buf.subarray(0, 2).toString() === "PK", `${buf.length} octets`);
}

// ===== 3. Purge automatique à 100 documents =====
console.log("\n— 3. Purge automatique de l'historique à 100 lignes —");
const [{ id: companyId }] = await restSvc("companies?select=id&name=eq.GARAYA%20HOLDING").then((r) => r.json());
const avant = await restSvc(`documents?select=id&company_id=eq.${companyId}`, { headers: { Prefer: "count=exact", Range: "0-0" } });
console.log(`  documents avant : ${avant.headers.get("content-range")?.split("/")[1]}`);
// Injecter 120 documents de test → le trigger doit maintenir 100 max
const lot = Array.from({ length: 120 }, (_, i) => ({
  company_id: companyId, doc_type: "autre", category: "rh",
  title: `Document de test purge n°${i + 1}`,
}));
for (let i = 0; i < 120; i += 30) {
  await restSvc("documents", { method: "POST", body: JSON.stringify(lot.slice(i, i + 30)) });
}
const apres = await restSvc(`documents?select=id&company_id=eq.${companyId}`, { headers: { Prefer: "count=exact", Range: "0-0" } });
const total = Number(apres.headers.get("content-range")?.split("/")[1]);
ok("Après insertion de 120 documents : 100 conservés max", total === 100, `${total} documents`);
// Les plus RÉCENTS sont conservés (le n°120 existe, le n°1 est purgé)
const dernier = await restSvc(`documents?select=title&company_id=eq.${companyId}&title=eq.${encodeURIComponent("Document de test purge n°120")}`).then((r) => r.json());
const premier = await restSvc(`documents?select=title&company_id=eq.${companyId}&title=eq.${encodeURIComponent("Document de test purge n°1")}`).then((r) => r.json());
ok("Le plus récent (n°120) est conservé", dernier.length === 1);
ok("Le plus ancien (n°1) a été purgé", premier.length === 0);
// Nettoyage des documents de test
await restSvc(`documents?company_id=eq.${companyId}&title=like.${encodeURIComponent("Document de test purge%")}`, { method: "DELETE" });
console.log("  (documents de test nettoyés)");

console.log(echecs === 0 ? "\n✓ TOUT FONCTIONNE." : `\n✗ ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
