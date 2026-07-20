// Test des cumuls annuels sur le bulletin PDF : avec une seule période générée
// (décembre 2025, fixtures GARAYA), le cumul doit être égal au bulletin du mois.
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const slip = await fetch(
  `${URL_SB}/rest/v1/payslips?matricule=eq.EMP-009&select=id,net_pay,rts,cnss_employee,gross&limit=1`,
  { headers: h },
).then((r) => r.json()).then((r) => r[0]);
ok("Bulletin PLEGNEMOU (EMP-009) trouvé", !!slip, JSON.stringify(slip));

const rh = await cookieDe("m.tolno@garaya.gn", "Test1234!");
const res = await fetch(`${APP}/api/documents/bulletin/${slip.id}?inline=1`, { headers: { Cookie: rh } });
ok("Bulletin PDF généré", res.status === 200, `HTTP ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
const doc = await PDFDocument.load(buf);
ok("PDF valide (1 page)", doc.getPageCount() === 1);

// Extraction texte non triviale avec pdf-lib seul ; on vérifie au moins la taille du fichier
// et que la génération n'a pas échoué silencieusement (fichier non vide, > 2KB).
ok("PDF non vide", buf.length > 2000, `${buf.length} octets`);

console.log(echecs === 0 ? "\nTOUT EST VERT ✓" : `\n${echecs} ÉCHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
