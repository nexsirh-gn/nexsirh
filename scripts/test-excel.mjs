// Test de bout en bout : génération + téléchargement de CHAQUE document Excel.
// Vérifie HTTP 200, la signature XLSX (ZIP "PK"), et les contrôles d'accès.
import { readFileSync, writeFileSync } from "node:fs";

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

async function login(email) {
  const auth = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password: "Test1234!" }),
  }).then((r) => r.json());
  const ref = new URL(URL_SB).hostname.split(".")[0];
  const val = "base64-" + Buffer.from(JSON.stringify(auth)).toString("base64url");
  const chunks = val.match(/.{1,3180}/g);
  return {
    cookie: chunks.length === 1
      ? `sb-${ref}-auth-token=${chunks[0]}`
      : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; "),
    token: auth.access_token,
  };
}
const rest = (token, path) =>
  fetch(`${URL_SB}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }).then((r) => r.json());

const rh = await login("m.tolno@garaya.gn");
console.log("Connexion m.tolno (admin RH) OK\n");
const [run] = await rest(rh.token, "payroll_runs?select=id&status=eq.cloture&limit=1");
const [emp] = await rest(rh.token, "employees?select=id&matricule=eq.EMP-002");

async function xlsxOk(label, url, garder = null) {
  const res = await fetch(`${APP}${url}`, { headers: { Cookie: rh.cookie } });
  const buf = Buffer.from(await res.arrayBuffer());
  const estXlsx = buf.subarray(0, 2).toString() === "PK"; // signature ZIP/XLSX
  const ct = res.headers.get("content-type") ?? "";
  ok(label, res.status === 200 && estXlsx && ct.includes("spreadsheetml"), `HTTP ${res.status} · ${buf.length} octets`);
  if (garder && estXlsx) writeFileSync(garder, buf);
}

console.log("— Documents Excel (période clôturée juin 2026) —");
await xlsxOk("Déclaration CNSS mensuelle", `/api/documents/generer?type=declaration_cnss&run=${run.id}&format=xlsx`, "scripts/_cnss.xlsx");
await xlsxOk("État RTS (DNI)", `/api/documents/generer?type=etat_rts&run=${run.id}&format=xlsx`);
await xlsxOk("État des salaires", `/api/documents/generer?type=etat_salaires&run=${run.id}&format=xlsx`);
await xlsxOk("Journal de paie", `/api/documents/generer?type=journal_paie&run=${run.id}&format=xlsx`);
await xlsxOk("Registre du personnel", `/api/documents/generer?type=registre_personnel&format=xlsx`, "scripts/_registre.xlsx");
await xlsxOk("Suivi des congés", `/api/documents/generer?type=suivi_conges&format=xlsx`);
await xlsxOk("Fiche individuelle (FAYE)", `/api/documents/generer?type=fiche_individuelle&employee=${emp.id}&format=xlsx`);

console.log("\n— Cas limites —");
const nonSupporte = await fetch(`${APP}/api/documents/generer?type=attestation_travail&employee=${emp.id}&format=xlsx`, { headers: { Cookie: rh.cookie } });
ok("Attestation en Excel → 400 propre (PDF uniquement)", nonSupporte.status === 400, `HTTP ${nonSupporte.status}`);

const camara = await login("b.camara@garaya.gn");
const refuse = await fetch(`${APP}/api/documents/generer?type=declaration_cnss&run=${run.id}&format=xlsx`, { headers: { Cookie: camara.cookie } });
ok("Employée → déclaration CNSS Excel refusée", refuse.status === 403, `HTTP ${refuse.status}`);

// Non-régression PDF
const pdf = await fetch(`${APP}/api/documents/generer?type=journal_paie&run=${run.id}`, { headers: { Cookie: rh.cookie } });
const bufPdf = Buffer.from(await pdf.arrayBuffer());
ok("Non-régression : journal PDF toujours OK", pdf.status === 200 && bufPdf.subarray(0, 5).toString() === "%PDF-");

console.log(echecs === 0 ? "\n✓ TOUT SE GÉNÈRE AU FORMAT EXCEL." : `\n✗ ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
