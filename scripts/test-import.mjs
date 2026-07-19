// Test E2E de l'import Excel des salariés (/api/import/employes) :
//   - GET modèle .xlsx téléchargeable
//   - POST prévisualisation : 1 ligne valide + 2 lignes en erreur (âge < 16, CDD > 24 mois)
//   - POST commit : seule la ligne valide est importée, matricule serveur
//   - contrôle rôle : employé → 403
//   - nettoyage : suppression du salarié de test (service_role)
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";

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

const rhCookie = await cookieDe("m.tolno@garaya.gn", "Test1234!");

// 1. Modèle (session requise — le proxy redirige les anonymes)
const modele = await fetch(`${APP}/api/import/employes`, { headers: { Cookie: rhCookie } });
ok("GET modèle .xlsx", modele.status === 200 &&
  (modele.headers.get("content-type") ?? "").includes("spreadsheetml"), `HTTP ${modele.status}`);

// 2. Fichier de test : 1 valide, 1 âge < 16, 1 CDD > 24 mois
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Salariés");
ws.addRow(["Civilité", "Nom", "Prénom", "Naissance", "Lieu", "Nationalité", "Tél", "Email", "Adresse", "CNSS",
  "Contrat", "Embauche", "Fin CDD", "Catégorie", "Base", "Anc", "Repas", "Logement", "Transport", "Cherté", "Banque", "Compte"]);
ws.addRow(["M.", "TESTIMPORT", "Valide", "10/01/1995", "Conakry", "Guinéenne", "620111222", "test.import@garaya.gn",
  "Conakry", "99999", "CDI", "01/08/2026", "", "Employé", 2000000, 0, 100000, 150000, 100000, 80000, "BIG", "000111"]);
ws.addRow(["M.", "TESTIMPORT", "Mineur", "10/01/2015", "Conakry", "Guinéenne", "", "", "", "",
  "CDI", "01/08/2026", "", "Employé", 1500000, 0, 0, 0, 0, 0, "", ""]);
ws.addRow(["Mme", "TESTIMPORT", "CddLong", "10/01/1990", "Conakry", "Guinéenne", "", "", "", "",
  "CDD", "01/08/2026", "01/08/2029", "Employé", 1500000, 0, 0, 0, 0, 0, "", ""]);
const buffer = Buffer.from(await wb.xlsx.writeBuffer());

const rh = rhCookie;
function form() {
  const fd = new FormData();
  fd.append("fichier", new File([buffer], "test.xlsx",
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  return fd;
}

// 3. Prévisualisation
const prev = await fetch(`${APP}/api/import/employes`, { method: "POST", body: form(), headers: { Cookie: rh } })
  .then((r) => r.json());
ok("Prévisualisation : 3 lignes lues, 1 valide, 2 en erreur",
  prev.total === 3 && prev.valides === 1 && prev.enErreur === 2, JSON.stringify({ t: prev.total, v: prev.valides, e: prev.enErreur }));
const errs = (prev.rapport ?? []).flatMap((r) => r.erreurs);
ok("Erreur âge < 16 détectée", errs.some((e) => e.includes("16 ans")));
ok("Erreur CDD > 24 mois détectée", errs.some((e) => e.includes("24 mois")));

// 4. Contrôle rôle : employé → 403
const emp = await cookieDe("g.plegnemou@garaya.gn", "Test1234!");
const refus = await fetch(`${APP}/api/import/employes`, { method: "POST", body: form(), headers: { Cookie: emp } });
ok("Employé (rôle manager) → import refusé 403", refus.status === 403, `HTTP ${refus.status}`);

// 5. Import réel
const imp = await fetch(`${APP}/api/import/employes?commit=1`, { method: "POST", body: form(), headers: { Cookie: rh } })
  .then((r) => r.json());
ok("Import : 1 salarié importé avec matricule serveur",
  imp.importes?.length === 1 && /^EMP-\d{3} TESTIMPORT Valide$/.test(imp.importes[0]), JSON.stringify(imp.importes));

// 6. Vérification en base + nettoyage (service_role)
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const rows = await fetch(`${URL_SB}/rest/v1/employees?last_name=eq.TESTIMPORT&select=id,matricule,first_name,employee_compensation(base_salary)`, { headers: h })
  .then((r) => r.json());
ok("En base : 1 seule ligne TESTIMPORT, salaire 2 000 000",
  rows.length === 1 && rows[0].employee_compensation?.base_salary === 2000000, JSON.stringify(rows));
for (const r of rows) {
  await fetch(`${URL_SB}/rest/v1/employees?id=eq.${r.id}`, { method: "DELETE", headers: h });
}
const restant = await fetch(`${URL_SB}/rest/v1/employees?last_name=eq.TESTIMPORT&select=id`, { headers: h }).then((r) => r.json());
ok("Nettoyage : salarié de test supprimé", restant.length === 0);

console.log(echecs === 0 ? "\nTOUT EST VERT ✓" : `\n${echecs} ÉCHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
