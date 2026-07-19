"use client";

import Link from "next/link";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";

export default function PortailAccueil() {
  const { data, loading, error } = useQuery(async (sb) => {
    // La RLS ne renvoie QUE les lignes de l'employé connecté
    const [dernierBulletin, solde, demandes] = await Promise.all([
      sb.from("payslips").select("id, net_pay, payroll_runs!inner(period_year, period_month, status)")
        .eq("payroll_runs.status", "cloture")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("leave_balances").select("entitled_days, seniority_bonus_days, carryover_days, taken_days").eq("year", 2026).maybeSingle(),
      sb.from("leave_requests").select("start_date, end_date, status").order("created_at", { ascending: false }).limit(3),
    ]);
    return { bulletin: dernierBulletin.data, solde: solde.data, demandes: demandes.data ?? [] };
  });

  if (loading) return <div className="note">Chargement…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const run = d.bulletin?.payroll_runs as unknown as { period_month: number } | null;
  const soldeDispo = d.solde
    ? d.solde.entitled_days + d.solde.seniority_bonus_days + d.solde.carryover_days - d.solde.taken_days
    : null;
  const enCours = d.demandes.find((x) => x.status.startsWith("attente"));

  return (
    <div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi gold">
          <div className="l">Dernier net perçu{run ? ` · ${MOIS[run.period_month]}` : ""}</div>
          <div className="v">{formatGNF(d.bulletin?.net_pay)} <span style={{ fontSize: 12, color: "var(--gris)" }}>GNF</span></div>
          <div className="d">{d.bulletin && <a className="link" href={`/api/documents/bulletin/${d.bulletin.id}?inline=1`} target="_blank" rel="noreferrer">Voir le bulletin →</a>}</div>
        </div>
        <div className="kpi">
          <div className="l">Solde de congés</div>
          <div className="v">{soldeDispo != null ? `${soldeDispo.toLocaleString("fr-FR")} j` : "—"}</div>
          <div className="d">
            {enCours
              ? <>demande du {new Date(enCours.start_date).toLocaleDateString("fr-FR")} : <span className="bg bg-o">en validation</span></>
              : "aucune demande en cours"}
          </div>
        </div>
        <div className="kpi">
          <div className="l">Droits 2026</div>
          <div className="v">{d.solde ? `${(d.solde.entitled_days + d.solde.seniority_bonus_days).toLocaleString("fr-FR")} j` : "—"}</div>
          <div className="d">dont ancienneté : <b>{d.solde?.seniority_bonus_days ?? 0} j</b></div>
        </div>
      </div>
      <div className="panel">
        <div className="hd"><h3>Actualité</h3></div>
        <div className="bd">
          {enCours && (
            <div className="alert vt"><span className="ic">✓</span><div>Votre demande de congé du <b>{new Date(enCours.start_date).toLocaleDateString("fr-FR")} au {new Date(enCours.end_date).toLocaleDateString("fr-FR")}</b> est en cours de validation.</div></div>
          )}
          {d.bulletin && (
            <div className="alert or"><span className="ic">📄</span><div>Votre bulletin{run ? ` de ${MOIS[run.period_month].toLowerCase()}` : ""} est disponible. <Link className="link" href="/portail/mes-bulletins">Le consulter →</Link></div></div>
          )}
          {!enCours && !d.bulletin && <div className="note">Rien de nouveau.</div>}
        </div>
      </div>
    </div>
  );
}
