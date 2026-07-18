// Test de bout en bout : génération + téléchargement de CHAQUE type de document.
// Connexion réelle (admin RH GARAYA), vérification HTTP 200 + signature %PDF,
// contrôle d'accès (employé limité), archivage des métadonnées.
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
  if (!auth.access_token) throw new Error(`Connexion ${email} échouée`);
  const ref = new URL(URL_SB).hostname.split(".")[0];
  const val = "base64-" + Buffer.from(JSON.stringify(auth)).toString("base64url");
  const chunks = val.match(/.{1,3180}/g);
  const cookie = chunks.length === 1
    ? `sb-${ref}-auth-token=${chunks[0]}`
    : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; ");
  return { cookie, token: auth.access_token };
}
const rest = (token, path) =>
  fetch(`${URL_SB}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } }).then((r) => r.json());

// ===== Connexion admin RH =====
const rh = await login("m.tolno@garaya.gn");
console.log("Connexion m.tolno (admin RH) OK\n");

const [emp] = await rest(rh.token, "employees?select=id,matricule&matricule=eq.EMP-007");
const [empSansConge] = await rest(rh.token, "employees?select=id&matricule=eq.EMP-024");
const [run] = await rest(rh.token, "payroll_runs?select=id&status=eq.cloture&limit=1");
const [slip] = await rest(rh.token, "payslips?select=id&matricule=eq.EMP-007&limit=1");

async function telecharger(label, url, cookie, garder = null) {
  const res = await fetch(`${APP}${url}`, { headers: { Cookie: cookie } });
  const buf = Buffer.from(await res.arrayBuffer());
  const estPdf = buf.subarray(0, 5).toString() === "%PDF-";
  ok(label, res.status === 200 && estPdf, `HTTP ${res.status} · ${buf.length} octets`);
  if (garder && estPdf) writeFileSync(garder, buf);
  return res.status;
}

// ===== 1. Documents individuels =====
console.log("— Documents individuels (CAMARA EMP-007) —");
await telecharger("Attestation de travail", `/api/documents/generer?type=attestation_travail&employee=${emp.id}`, rh.cookie, "scripts/_att.pdf");
await telecharger("Certificat de travail", `/api/documents/generer?type=certificat_travail&employee=${emp.id}`, rh.cookie);
// CAMARA n'a pas de congé approuvé (attente_rh) → on prend FAYE (CA de mars approuvé)
const [fayePourConge] = await rest(rh.token, "employees?select=id&matricule=eq.EMP-002");
await telecharger("Certificat de congé (FAYE)", `/api/documents/generer?type=certificat_conge&employee=${fayePourConge.id}`, rh.cookie);
await telecharger("Solde de tout compte", `/api/documents/generer?type=solde_tout_compte&employee=${emp.id}`, rh.cookie, "scripts/_solde.pdf");
await telecharger("Fiche individuelle", `/api/documents/generer?type=fiche_individuelle&employee=${emp.id}`, rh.cookie);

// Cas limite : certificat de congé sans congé approuvé → 404 propre
const s404 = await fetch(`${APP}/api/documents/generer?type=certificat_conge&employee=${empSansConge.id}`, { headers: { Cookie: rh.cookie } });
ok("Certificat sans congé approuvé → 404 propre", s404.status === 404, `HTTP ${s404.status}`);

// ===== 2. États de paie =====
console.log("\n— États de paie (juin 2026, clôturée) —");
await telecharger("Journal de paie", `/api/documents/generer?type=journal_paie&run=${run.id}`, rh.cookie, "scripts/_journal.pdf");
await telecharger("État RTS (eTax/DNI)", `/api/documents/generer?type=etat_rts&run=${run.id}`, rh.cookie);
await telecharger("Déclaration CNSS", `/api/documents/generer?type=declaration_cnss&run=${run.id}`, rh.cookie);
await telecharger("État des salaires", `/api/documents/generer?type=etat_salaires&run=${run.id}`, rh.cookie);

// ===== 3. Registres =====
console.log("\n— Registres —");
await telecharger("Registre du personnel", `/api/documents/generer?type=registre_personnel`, rh.cookie, "scripts/_registre.pdf");
await telecharger("Suivi des congés 2026", `/api/documents/generer?type=suivi_conges`, rh.cookie);

// ===== 4. Bulletin (non-régression) =====
console.log("\n— Bulletin (non-régression) —");
await telecharger("Bulletin PDF", `/api/documents/bulletin/${slip.id}`, rh.cookie);

// ===== 5. Contrôles d'accès =====
console.log("\n— Contrôles d'accès (CAMARA, rôle employé) —");
const camara = await login("b.camara@garaya.gn");
const [faye] = await rest(rh.token, "employees?select=id&matricule=eq.EMP-002");
const a1 = await fetch(`${APP}/api/documents/generer?type=attestation_travail&employee=${faye.id}`, { headers: { Cookie: camara.cookie } });
ok("Employée → attestation d'un AUTRE salarié refusée", a1.status === 404, `HTTP ${a1.status}`);
const a2 = await fetch(`${APP}/api/documents/generer?type=journal_paie&run=${run.id}`, { headers: { Cookie: camara.cookie } });
ok("Employée → journal de paie refusé", a2.status === 403, `HTTP ${a2.status}`);
const a3 = await fetch(`${APP}/api/documents/generer?type=attestation_travail&employee=${emp.id}`, { headers: { Cookie: camara.cookie } });
ok("Employée → SA propre attestation autorisée", a3.status === 200, `HTTP ${a3.status}`);

// ===== 6. Métadonnées archivées =====
const docs = await rest(rh.token, "documents?select=doc_type&order=created_at.desc&limit=15");
const typesArchives = [...new Set(docs.map((d) => d.doc_type))];
ok("Métadonnées archivées dans « documents »", typesArchives.length >= 5, typesArchives.join(", "));

console.log(echecs === 0 ? "\n✓ TOUT FONCTIONNE — tous les documents se génèrent et se téléchargent." : `\n✗ ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
