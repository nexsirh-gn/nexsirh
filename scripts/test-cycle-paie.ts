/**
 * Test E2E du CYCLE DE PAIE (étape N) — même code que les Server Actions
 * (lib/paie/generation), exécuté sous RLS avec le compte admin RH.
 *   1. Générer août 2026 → 9 bulletins, FAYE au franc près (fixtures)
 *   2. Retenue manuelle → net diminué
 *   3. Recalcul → la saisie manuelle SURVIT (§6.6)
 *   4. Rappel → réinjecté dans la chaîne (brut, CNSS, RTS recalculés)
 *   5. Retenue rendant le net négatif → BLOQUÉE (§6.7)
 *   6. HS validées injectées au recalcul de juillet (SYLLA oui, CONTE non)
 *   7. Nettoyage : suppression du brouillon d'août
 * Usage : npx tsx scripts/test-cycle-paie.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { genererPaieDB, recalculerPaieDB, ajouterAjustementDB } from "../lib/paie/generation";

config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let echecs = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "  OK " : "ÉCHEC"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) echecs++;
};

async function main() {
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error: eAuth } = await sb.auth.signInWithPassword({
    email: "m.tolno@garaya.gn", password: "Test1234!",
  });
  if (eAuth) throw eAuth;
  const { data: profil } = await sb.from("profiles").select("company_id").eq("id", auth.user!.id).single();
  const companyId = profil!.company_id as string;
  console.log("Connexion m.tolno (admin RH, RLS active) OK\n");

  const slipDe = async (runId: string, mat: string) =>
    (await sb.from("payslips").select("*").eq("payroll_run_id", runId).eq("matricule", mat).single()).data!;

  // ---------- 1. Génération d'août 2026 ----------
  console.log("— 1. Génération d'août 2026 —");
  const nb = await genererPaieDB(sb, companyId, auth.user!.id, 2026, 8);
  ok("9 bulletins générés (8 fixtures + DIALLO, VERIF sorti exclu)", nb === 9, `${nb}`);
  const { data: runAout } = await sb.from("payroll_runs").select("id, status")
    .eq("period_year", 2026).eq("period_month", 8).single();
  ok("Période créée en brouillon", runAout!.status === "brouillon");
  const faye = await slipDe(runAout!.id, "EMP-002");
  ok("FAYE au franc près (net 1 503 268, prêt déduit)", faye.net_pay === 1_503_268, `${faye.net_pay}`);
  ok("FAYE RTS 99 750", faye.rts === 99_750, `${faye.rts}`);
  const doublon = await genererPaieDB(sb, companyId, auth.user!.id, 2026, 8).catch((e: Error) => e.message);
  ok("Double génération refusée", String(doublon).includes("existe déjà"));

  // ---------- 2. Retenue manuelle ----------
  console.log("\n— 2. Retenue manuelle (TOLNO, 100 000) —");
  let tolno = await slipDe(runAout!.id, "EMP-004");
  await ajouterAjustementDB(sb, companyId, tolno.id, "retenue", "Avance sur salaire", 100_000);
  tolno = await slipDe(runAout!.id, "EMP-004");
  ok("Net diminué de 100 000 (3 149 000 → 3 049 000)", tolno.net_pay === 3_049_000, `${tolno.net_pay}`);

  // ---------- 3. Recalcul : la saisie survit ----------
  console.log("\n— 3. Recalcul du brouillon —");
  await recalculerPaieDB(sb, companyId, runAout!.id);
  tolno = await slipDe(runAout!.id, "EMP-004");
  ok("La retenue manuelle SURVIT au recalcul (§6.6)", tolno.net_pay === 3_049_000, `${tolno.net_pay}`);
  const faye2 = await slipDe(runAout!.id, "EMP-002");
  ok("FAYE inchangé après recalcul", faye2.net_pay === 1_503_268);

  // ---------- 4. Rappel réinjecté dans la chaîne ----------
  console.log("\n— 4. Rappel (TRAORE, 200 000 — gain imposable) —");
  let traore = await slipDe(runAout!.id, "EMP-005");
  await ajouterAjustementDB(sb, companyId, traore.id, "rappel", "Rappel juin", 200_000);
  traore = await slipDe(runAout!.id, "EMP-005");
  // brut 2 945 000 ; NI 2 210 000 ; RTS 60 500 ; net 2 759 500
  ok("Brut recalculé (2 945 000)", traore.gross === 2_945_000, `${traore.gross}`);
  ok("RTS recalculée (60 500)", traore.rts === 60_500, `${traore.rts}`);
  ok("Net recalculé (2 759 500)", traore.net_pay === 2_759_500, `${traore.net_pay}`);

  // ---------- 5. Net négatif bloqué ----------
  console.log("\n— 5. Retenue rendant le net négatif —");
  const barry = await slipDe(runAout!.id, "EMP-008");
  const refus = await ajouterAjustementDB(sb, companyId, barry.id, "retenue", "Test négatif", 10_000_000)
    .catch((e: Error) => e.message);
  ok("Erreur BLOQUANTE (§6.7)", String(refus).includes("négatif"), String(refus).slice(0, 60));
  const barry2 = await slipDe(runAout!.id, "EMP-008");
  ok("Bulletin intact après refus", barry2.net_pay === 2_418_500);

  // ---------- 6. HS validées injectées (recalcul juillet) ----------
  console.log("\n— 6. Heures supplémentaires (recalcul juillet 2026) —");
  const { data: runJuil } = await sb.from("payroll_runs").select("id")
    .eq("period_year", 2026).eq("period_month", 7).single();
  await recalculerPaieDB(sb, companyId, runJuil!.id);
  const sylla = await slipDe(runJuil!.id, "EMP-006");
  // SYLLA (feuille VALIDÉE, HS 86 540) : brut 2 215 000 + 86 540 = 2 301 540
  ok("SYLLA : HS validées injectées (brut 2 301 540)", sylla.gross === 2_301_540, `${sylla.gross}`);
  const conte = await slipDe(runJuil!.id, "EMP-010");
  ok("CONTE : feuille NON validée → pas de HS (brut 2 656 000)", conte.gross === 2_656_000, `${conte.gross}`);
  const { data: tsSylla } = await sb.from("timesheets").select("status")
    .eq("period_year", 2026).eq("period_month", 7).eq("employee_id", sylla.employee_id).single();
  ok("Feuille SYLLA passée « transmise à la paie »", tsSylla!.status === "transmis_paie");

  // ---------- 7. Nettoyage ----------
  console.log("\n— 7. Nettoyage —");
  const { error: eDel } = await sb.from("payroll_runs").delete().eq("id", runAout!.id);
  ok("Brouillon d'août supprimé (autorisé en brouillon)", !eDel);

  console.log(echecs === 0 ? "\n✓ CYCLE DE PAIE CONFORME (étape N)." : `\n✗ ${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Échec :", e); process.exit(1); });
