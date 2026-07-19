"use client";

import Link from "next/link";
import { useModal } from "@/components/providers";
import { useQuery, formatGNF, initiales, MOIS } from "@/lib/hooks";

export default function Dashboard() {
  const { om } = useModal();

  const { data, loading, error } = useQuery(async (sb) => {
    const [effectif, paieJuin, runJuillet, demandes, employes, deps] = await Promise.all([
      sb.from("employees").select("id", { count: "exact", head: true }).in("status", ["actif", "essai"]),
      sb.from("payslips").select("gross, cnss_employer, vf, cfpa, payroll_runs!inner(period_year, period_month)")
        .eq("payroll_runs.period_year", 2026).eq("payroll_runs.period_month", 6),
      sb.from("payroll_runs").select("id, status, period_month, period_year, payslips(count)")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(1).maybeSingle(),
      sb.from("leave_requests").select("id, leave_type_code, start_date, end_date, working_days, status, employees(first_name, last_name), leave_types:leave_type_id(name)")
        .in("status", ["attente_manager", "attente_rh"]).order("created_at"),
      sb.from("employees").select("first_name, last_name, contract_type, contract_end_date, id_doc_expiry, trial_end_date, status, department_id"),
      sb.from("departments").select("id, name"),
    ]);
    const masse = (paieJuin.data ?? []).reduce((s, p) => s + p.gross, 0);
    const cout = (paieJuin.data ?? []).reduce((s, p) => s + p.gross + p.cnss_employer + p.vf + p.cfpa, 0);
    return {
      effectif: effectif.count ?? 0,
      masse, cout,
      run: runJuillet.data,
      demandes: demandes.data ?? [],
      employes: employes.data ?? [],
      deps: deps.data ?? [],
    };
  });

  if (loading) return <div className="note">Chargement du tableau de bord…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  const cddAlerte = d.employes.filter((e) => e.contract_type === "CDD" && e.contract_end_date);
  const pieceAlerte = d.employes.filter((e) => e.id_doc_expiry && new Date(e.id_doc_expiry) < new Date("2026-10-01"));
  const essaiAlerte = d.employes.filter((e) => e.status === "essai" && e.trial_end_date);
  const repartition = d.deps.map((dep) => ({
    nom: dep.name,
    n: d.employes.filter((e) => e.department_id === dep.id).length,
  })).filter((r) => r.n > 0);
  const couleurs = ["var(--vert)", "var(--or)", "var(--bleu)", "#B9CCC5"];

  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="l">Effectif actif</div><div className="v">{d.effectif}</div><div className="d">salariés actifs ou en essai</div></div>
        <div className="kpi gold"><div className="l">Masse salariale · Juin</div><div className="v">{formatGNF(d.masse)} <span style={{ fontSize: 13, color: "var(--gris)" }}>GNF</span></div><div className="d">Coût employeur : <b className="mono">{formatGNF(d.cout)}</b></div></div>
        <div className="kpi"><div className="l">Congés en attente</div><div className="v">{d.demandes.length}</div><div className="d">demandes à traiter</div></div>
        <div className="kpi">
          <div className="l">Paie de {d.run ? MOIS[d.run.period_month].toLowerCase() : "—"}</div>
          <div className="v" style={{ fontSize: 16, paddingTop: 6 }}>
            {d.run ? (
              <span className={`bg ${d.run.status === "brouillon" ? "bg-o" : "bg-v"}`}>
                {d.run.status === "brouillon" ? "Brouillon" : d.run.status === "cloture" ? "Clôturée" : "Validée"} — {(d.run.payslips as { count: number }[])?.[0]?.count ?? 0} bulletins
              </span>
            ) : <span className="bg bg-g">Aucune paie</span>}
          </div>
          <div className="d"><Link className="link" href="/paie">Ouvrir le cycle de paie →</Link></div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Demandes de congés à traiter</h3><span className="sp" /><Link className="link" href="/conges">Tout voir →</Link></div>
          <table>
            <tbody>
              <tr><th>Salarié</th><th>Type</th><th>Période</th><th className="num">Jours</th><th>Statut</th><th></th></tr>
              {d.demandes.map((dem) => {
                const emp = dem.employees as unknown as { first_name: string; last_name: string } | null;
                const nom = emp ? `${emp.last_name} ${emp.first_name}` : "—";
                return (
                  <tr key={dem.id}>
                    <td><div className="emp"><span className="av g">{initiales(nom)}</span><div><b>{nom}</b></div></div></td>
                    <td>{dem.leave_type_code}</td>
                    <td>{new Date(dem.start_date).toLocaleDateString("fr-FR")} – {new Date(dem.end_date).toLocaleDateString("fr-FR")}</td>
                    <td className="gnf mono">{dem.working_days}</td>
                    <td><span className={`bg ${dem.status === "attente_rh" ? "bg-o" : "bg-b"}`}>{dem.status === "attente_rh" ? "Attente RH" : "Attente manager"}</span></td>
                    <td><Link className="btn btn-o btn-sm" href="/conges">Traiter →</Link></td>
                  </tr>
                );
              })}
              {d.demandes.length === 0 && <tr><td colSpan={6} className="note">Aucune demande en attente.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Alertes RH</h3><span className="sp" /><span className="bg bg-r">{cddAlerte.length + pieceAlerte.length + essaiAlerte.length}</span></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            {cddAlerte.map((e, i) => (
              <div key={`c${i}`} className="alert rg"><span className="ic">⚠</span><div><b>CDD — {e.last_name} {e.first_name}</b> arrive à échéance le {new Date(e.contract_end_date!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {pieceAlerte.map((e, i) => (
              <div key={`p${i}`} className="alert or"><span className="ic">🪪</span><div><b>Pièce d’identité — {e.last_name} {e.first_name}</b> expire le {new Date(e.id_doc_expiry!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {essaiAlerte.map((e, i) => (
              <div key={`e${i}`} className="alert or"><span className="ic">🕒</span><div><b>Période d’essai — {e.last_name} {e.first_name}</b> à confirmer avant le {new Date(e.trial_end_date!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {cddAlerte.length + pieceAlerte.length + essaiAlerte.length === 0 && (
              <div className="alert vt"><span className="ic">✓</span><div>Aucune alerte RH en cours.</div></div>
            )}
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Répartition de l’effectif</h3></div>
          <div className="bd">
            <div className="leg">
              {repartition.map((r, i) => (
                <div key={r.nom}><i style={{ background: couleurs[i % 4] }} /><b>{r.n}</b> — {r.nom}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Raccourcis</h3></div>
          <div className="bd" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-p btn-sm" onClick={() => om("mNouvelEmploye")}>+ Nouvel employé</button>
            <Link className="btn btn-o btn-sm" href="/paie">Paie mensuelle</Link>
            <Link className="btn btn-o btn-sm" href="/documents">Documents légaux</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
