// Test E2E du Lot 4 : profils réels, invitation réelle, référentiels éditables.
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let echecs = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  OK " : "ÉCHEC"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) echecs++;
};
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function tokenDe(email, password) {
  const auth = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!auth.access_token) throw new Error(`Connexion ${email} : ${JSON.stringify(auth)}`);
  return auth.access_token;
}

// 1. Mon profil : mise à jour directe (RLS id = auth.uid())
const tokenRh = await tokenDe("m.tolno@garaya.gn", "Test1234!");
const avant = await fetch(`${URL_SB}/rest/v1/profiles?select=id,full_name,phone,company_id&email=eq.m.tolno@garaya.gn`, { headers: h }).then((r) => r.json()).then((r) => r[0]);
const majProfil = await fetch(`${URL_SB}/rest/v1/profiles?id=eq.${avant.id}`, {
  method: "PATCH",
  headers: { apikey: ANON, Authorization: `Bearer ${tokenRh}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ phone: "620999888" }),
}).then((r) => r.json());
ok("Profil : l'utilisateur met à jour son propre téléphone (RLS)", majProfil[0]?.phone === "620999888", JSON.stringify(majProfil));
// restauration
await fetch(`${URL_SB}/rest/v1/profiles?id=eq.${avant.id}`, {
  method: "PATCH", headers: h, body: JSON.stringify({ phone: avant.phone }),
});

// 2. update_my_contact : un employé met à jour SES coordonnées via RPC
const tokenEmp = await tokenDe("g.plegnemou@garaya.gn", "Test1234!");
const rpc = await fetch(`${URL_SB}/rest/v1/rpc/update_my_contact`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${tokenEmp}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_phone: "622111000", p_address: null, p_emergency_contact_name: null, p_emergency_contact_phone: null }),
});
ok("update_my_contact : la RPC répond 2xx/204", rpc.status < 300, `HTTP ${rpc.status}`);
const empRow = await fetch(`${URL_SB}/rest/v1/employees?select=phone&matricule=eq.EMP-009`, { headers: h }).then((r) => r.json()).then((r) => r[0]);
ok("update_my_contact : téléphone mis à jour en base", empRow?.phone === "622111000", JSON.stringify(empRow));

// 3. Référentiels : premium_types / leave_types insérables par RH via RLS
const primeIns = await fetch(`${URL_SB}/rest/v1/premium_types`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${tokenRh}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ company_id: avant.company_id, code: "TESTPRIME", name: "Prime de test", taxable_rts: true, subject_cnss: false }),
}).then((r) => r.json());
ok("premium_types : la RH peut créer un type de prime", Array.isArray(primeIns) ? primeIns.length === 1 : false, JSON.stringify(primeIns));

// nettoyage
await fetch(`${URL_SB}/rest/v1/premium_types?code=eq.TESTPRIME`, { method: "DELETE", headers: h });
const purge = await fetch(`${URL_SB}/rest/v1/premium_types?code=eq.TESTPRIME`, { headers: h }).then((r) => r.json());
ok("Nettoyage : type de prime de test supprimé", purge.length === 0);

console.log(echecs === 0 ? "\nTOUT EST VERT ✓" : `\n${echecs} ÉCHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
