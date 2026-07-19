// Test du contrôle d'accès à la console /admin/* (proxy.ts) :
//   - anonyme            → redirigé vers /admin (connexion console)
//   - admin d'entreprise → redirigé vers /dashboard (PAS d'accès console)
//   - super_admin        → 200
import { readFileSync } from "node:fs";

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
async function statut(url, cookie = null) {
  const res = await fetch(`${APP}${url}`, {
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : {},
  });
  return { status: res.status, location: res.headers.get("location") ?? "" };
}

// 1. Anonyme
const anon = await statut("/admin/dashboard");
ok("Anonyme → /admin/dashboard redirigé vers la connexion console",
  anon.status >= 300 && anon.status < 400 && anon.location.includes("/admin"),
  `HTTP ${anon.status} → ${anon.location}`);

// 2. Admin d'entreprise (m.tolno) — PAS super_admin
const tolno = await cookieDe("m.tolno@garaya.gn", "Test1234!");
const refuse = await statut("/admin/dashboard", tolno);
ok("Admin d'entreprise → console REFUSÉE (redirigé vers /dashboard)",
  refuse.status >= 300 && refuse.status < 400 && refuse.location.includes("/dashboard"),
  `HTTP ${refuse.status} → ${refuse.location}`);
const appOk = await statut("/dashboard", tolno);
ok("Admin d'entreprise → son app cliente accessible", appOk.status === 200, `HTTP ${appOk.status}`);

// 3. Super admin
const admin = await cookieDe(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const autorise = await statut("/admin/dashboard", admin);
ok("Super admin → console accessible", autorise.status === 200, `HTTP ${autorise.status}`);

// 4. Employée → console refusée aussi
const camara = await cookieDe("b.camara@garaya.gn", "Test1234!");
const refuse2 = await statut("/admin/entreprises", camara);
ok("Employée → console refusée", refuse2.status >= 300 && refuse2.location.includes("/dashboard"), `HTTP ${refuse2.status}`);

console.log(echecs === 0 ? "\n✓ Contrôle d'accès console CONFORME." : `\n✗ ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
