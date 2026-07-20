// Test E2E des « États prêts à imprimer » (/rapports) : les 4 boutons doivent
// produire un PDF réel via /api/documents/generer.
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP = "http://localhost:3000";
let echecs = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  OK " : "ÉCHEC"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) echecs++;
};

async function cookieDe(email, password) {
  const auth = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!auth.access_token) throw new Error(`Connexion ${email} : ${JSON.stringify(auth)}`);
  const ref = new URL(URL_SB).hostname.split(".")[0];
  const val = "base64-" + Buffer.from(JSON.stringify(auth)).toString("base64url");
  const chunks = val.match(/.{1,3180}/g);
  return chunks.length === 1
    ? `sb-${ref}-auth-token=${chunks[0]}`
    : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; ");
}

const rh = await cookieDe("m.tolno@garaya.gn", "Test1234!");

const etats = [
  ["État des effectifs par département", "effectifs_departement"],
  ["Registre de l’employeur", "registre_personnel"],
  ["Synthèse masse salariale annuelle", "synthese_masse_salariale&annee=2026"],
  ["État des contrats à échéance", "contrats_echeance"],
];

for (const [label, type] of etats) {
  const res = await fetch(`${APP}/api/documents/generer?type=${type}`, { headers: { Cookie: rh } });
  const ct = res.headers.get("content-type") ?? "";
  if (res.status !== 200) { ok(label, false, `HTTP ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  let pages = 0;
  try { pages = (await PDFDocument.load(buf)).getPageCount(); } catch { /* pas un PDF */ }
  ok(label, ct.includes("pdf") && pages >= 1 && buf.length > 1500, `${pages} page(s), ${buf.length} o`);
}

// Contrôle de rôle : un employé (manager) ne doit pas générer ces états d'entreprise
const emp = await cookieDe("g.plegnemou@garaya.gn", "Test1234!");
const refus = await fetch(`${APP}/api/documents/generer?type=effectifs_departement`, { headers: { Cookie: emp } });
ok("Manager → état d'entreprise refusé (403)", refus.status === 403, `HTTP ${refus.status}`);

console.log(echecs === 0 ? "\nTOUT EST VERT ✓" : `\n${echecs} ÉCHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
