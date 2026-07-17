"use client";

import { useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

export default function Monitoring() {
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [crons, incidents] = await Promise.all([
      sb.from("cron_runs").select("*").order("ran_at", { ascending: false }).limit(20),
      sb.from("platform_incidents").select("*").order("started_at", { ascending: false }),
    ]);
    return { crons: crons.data ?? [], incidents: incidents.data ?? [] };
  });

  if (loading) return <div className="note">Chargement du monitoring…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const enCours = d.incidents.filter((i) => !i.resolved_at);
  // Dernière exécution par tâche
  const dernieres = [...new Map(d.crons.map((c) => [c.task_name, c])).values()];

  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="l">Incidents en cours</div><div className="v">{enCours.length}</div><div className="d">{d.incidents.length} au total</div></div>
        <div className="kpi"><div className="l">Tâches planifiées</div><div className="v">{dernieres.length}</div><div className="d">{dernieres.filter((c) => c.status === "ok").length} OK · {dernieres.filter((c) => c.status === "warn").length} avertissement(s)</div></div>
        <div className="kpi"><div className="l">Dernier incident</div><div className="v" style={{ fontSize: 17, paddingTop: 6 }}>{d.incidents[0] ? new Date(d.incidents[0].started_at).toLocaleDateString("fr-FR") : "—"}</div><div className="d">{d.incidents[0]?.resolved_at ? "résolu" : d.incidents[0] ? "en cours" : ""}</div></div>
        <div className="kpi"><div className="l">Base de données</div><div className="v" style={{ fontSize: 17, paddingTop: 6 }}>Supabase</div><div className="d">sauvegardes quotidiennes automatiques</div></div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Tâches planifiées (cron)</h3></div>
          <table>
            <tbody>
              <tr><th>Tâche</th><th>Fréquence</th><th>Dernière exécution</th><th>Statut</th></tr>
              {dernieres.map((c) => (
                <tr key={c.id}>
                  <td>{c.task_name}</td>
                  <td>{c.frequency ?? "—"}</td>
                  <td>{new Date(c.ran_at).toLocaleString("fr-FR")} · {c.duration_ms ? `${(c.duration_ms / 1000).toLocaleString("fr-FR")} s` : "—"}</td>
                  <td><span className={`sev ${c.status === "ok" ? "ok" : c.status === "warn" ? "warn" : "err"}`} />{c.status === "ok" ? "OK" : c.detail ?? c.status}</td>
                </tr>
              ))}
              {dernieres.length === 0 && <tr><td colSpan={4} className="note">Aucune tâche exécutée (crons Vercel : étape X).</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Journal des incidents</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Formulaire de déclaration d’incident ouvert")}>+ Déclarer</button></div>
          <div className="bd">
            <div className="timeline">
              {d.incidents.map((i) => (
                <div key={i.id} className="tl">
                  <small>{new Date(i.started_at).toLocaleString("fr-FR")}{i.resolved_at ? ` – ${new Date(i.resolved_at).toLocaleTimeString("fr-FR")}` : ""} · {i.severity}</small>
                  <b>{i.title}</b>{i.description ? ` — ${i.description}` : ""}
                </div>
              ))}
              {d.incidents.length === 0 && <div className="note">Aucun incident.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
