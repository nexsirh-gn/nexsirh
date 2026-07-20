"use client";

import Link from "next/link";
import { useModal } from "@/components/providers";
import { useQuery, formatGNF, initiales, MOIS } from "@/lib/hooks";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

const COULEURS = ["#0F5C49", "#D9A441", "#2E6E8E", "#B9CCC5", "#C24B3A", "#7A9A8F"];

export default function Dashboard() {
  const { om } = useModal();

  const { data, loading, error } = useQuery(async (sb) => {
    const j30 = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);
    const aujourd = new Date().toISOString().slice(0, 10);
    const [effectif, slips, runDernier, demandes, employes, deps] = await Promise.all([
      sb.from("employees").select("id", { count: "exact", head: true }).in("status", ["actif", "essai"]),
      sb.from("payslips").select("gross, cnss_employer, vf, cfpa, payroll_runs!inner(period_year, period_month)"),
      sb.from("payroll_runs").select("id, status, period_month, period_year, payslips(count)")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(1).maybeSingle(),
      sb.from("leave_requests").select("id, leave_type_code, start_date, end_date, working_days, status, employees(first_name, last_name)")
        .in("status", ["attente_manager", "attente_rh"]).order("created_at"),
      sb.from("employees").select("first_name, last_name, contract_type, contract_end_date, id_doc_expiry, trial_end_date, status, department_id")
        .in("status", ["actif", "essai"]),
      sb.from("departments").select("id, name"),
    ]);
    type Run = { period_year: number; period_month: number };
    const parPeriode = new Map<string, { label: string; annee: number; mois: number; masse: number; cout: number }>();
    for (const p of slips.data ?? []) {
      const r = p.payroll_runs as unknown as Run;
      const cle = `${r.period_year}-${String(r.period_month).padStart(2, "0")}`;
      const e = parPeriode.get(cle) ?? { label: `${MOIS[r.period_month].slice(0, 3)} ${String(r.period_year).slice(2)}`, annee: r.period_year, mois: r.period_month, masse: 0, cout: 0 };
      e.masse += p.gross;
      e.cout += p.gross + p.cnss_employer + p.vf + p.cfpa;
      parPeriode.set(cle, e);
    }
    const historique = [...parPeriode.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
    const dernier = historique[historique.length - 1];
    // Alertes J-30 calculées ici (pas de Date.now() en rendu — React Compiler)
    const emps = employes.data ?? [];
    const dansJ30 = (d: string | null) => !!d && d <= j30 && d >= aujourd;
    return {
      effectif: effectif.count ?? 0,
      historique, dernier,
      run: runDernier.data,
      demandes: demandes.data ?? [],
      cddAlerte: emps.filter((e) => e.contract_type === "CDD" && dansJ30(e.contract_end_date)),
      pieceAlerte: emps.filter((e) => dansJ30(e.id_doc_expiry)),
      essaiAlerte: emps.filter((e) => e.status === "essai" && dansJ30(e.trial_end_date)),
      repartition: (deps.data ?? []).map((dep) => ({
        name: dep.name,
        value: emps.filter((e) => e.department_id === dep.id).length,
      })).filter((r) => r.value > 0),
    };
  });

  if (loading) return <div className="note">Chargement du tableau de bord…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const nbAlertes = d.cddAlerte.length + d.pieceAlerte.length + d.essaiAlerte.length;

  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="l">Effectif actif</div><div className="v">{d.effectif}</div><div className="d">salariés actifs ou en essai</div></div>
        <div className="kpi gold">
          <div className="l">Masse salariale · {d.dernier ? d.dernier.label : "—"}</div>
          <div className="v">{formatGNF(d.dernier?.masse ?? 0)} <span style={{ fontSize: 13, color: "var(--gris)" }}>GNF</span></div>
          <div className="d">Coût employeur : <b className="mono">{formatGNF(d.dernier?.cout ?? 0)}</b></div>
        </div>
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
          <div className="hd"><h3>Masse salariale — 6 dernières périodes</h3><span className="sp" /><span className="bg bg-g">GNF (millions)</span></div>
          <div className="bd" style={{ height: 260 }}>
            {d.historique.length === 0 ? <div className="note">Aucune paie générée.</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.historique} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE8E4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v / 1e6)}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip formatter={(v) => [`${formatGNF(Number(v))} GNF`]} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 10, border: "1px solid #DFE8E4", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }} />
                  <Bar dataKey="masse" name="Brut" fill="#0F5C49" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="cout" name="Coût employeur" fill="#D9A441" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Répartition de l’effectif</h3></div>
          <div className="bd" style={{ height: 260, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: "55%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.repartition} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none">
                    {d.repartition.map((_, i) => <Cell key={i} fill={COULEURS[i % COULEURS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} salarié(s)`, n]} contentStyle={{ borderRadius: 10, border: "1px solid #DFE8E4", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="leg" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              {d.repartition.map((r, i) => (
                <div key={r.name}><i style={{ background: COULEURS[i % COULEURS.length] }} /><b>{r.value}</b> — {r.name}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
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
          <div className="hd"><h3>Alertes RH — 30 prochains jours</h3><span className="sp" /><span className={`bg ${nbAlertes > 0 ? "bg-r" : "bg-v"}`}>{nbAlertes}</span></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            {d.cddAlerte.map((e, i) => (
              <div key={`c${i}`} className="alert rg"><span className="ic">⚠</span><div><b>CDD — {e.last_name} {e.first_name}</b> arrive à échéance le {new Date(e.contract_end_date!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {d.pieceAlerte.map((e, i) => (
              <div key={`p${i}`} className="alert or"><span className="ic">🪪</span><div><b>Pièce d’identité — {e.last_name} {e.first_name}</b> expire le {new Date(e.id_doc_expiry!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {d.essaiAlerte.map((e, i) => (
              <div key={`e${i}`} className="alert or"><span className="ic">🕒</span><div><b>Période d’essai — {e.last_name} {e.first_name}</b> à confirmer avant le {new Date(e.trial_end_date!).toLocaleDateString("fr-FR")}.</div></div>
            ))}
            {nbAlertes === 0 && (
              <div className="alert vt"><span className="ic">✓</span><div>Aucune échéance dans les 30 prochains jours.</div></div>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>Raccourcis</h3></div>
        <div className="bd" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-p btn-sm" onClick={() => om("mNouvelEmploye")}>+ Nouvel employé</button>
          <Link className="btn btn-o btn-sm" href="/paie">Paie mensuelle</Link>
          <Link className="btn btn-o btn-sm" href="/documents">Documents légaux</Link>
        </div>
      </div>
    </div>
  );
}
