"use client";

import Link from "next/link";
import { useModal } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function VueEnsemble() {
  const { om } = useModal();

  const { data, loading, error } = useQuery(async (sb) => {
    const [companies, subs, plans, tickets, incidents, employees] = await Promise.all([
      sb.from("companies").select("id, name, sector, city, status, created_at"),
      sb.from("subscriptions").select("company_id, status, plan_id, trial_ends_at, failed_payments"),
      sb.from("plans").select("id, price_gnf"),
      sb.from("support_tickets").select("id, number, subject, priority, status, companies(name)").in("status", ["ouvert", "en_cours"]),
      sb.from("platform_incidents").select("title, started_at, resolved_at, severity").order("started_at", { ascending: false }).limit(3),
      sb.from("employees").select("id", { count: "exact", head: true }),
    ]);
    return {
      companies: companies.data ?? [], subs: subs.data ?? [], plans: plans.data ?? [],
      tickets: tickets.data ?? [], incidents: incidents.data ?? [], nbEmployes: employees.count ?? 0,
    };
  });

  if (loading) return <div className="note">Chargement de la vue d’ensemble…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  const prix = new Map(d.plans.map((p) => [p.id, p.price_gnf ?? 0]));
  const mrr = d.subs.filter((s) => s.status === "active").reduce((t, s) => t + (prix.get(s.plan_id) ?? 0), 0);
  const actives = d.subs.filter((s) => s.status === "active").length;
  const essais = d.subs.filter((s) => s.status === "trial").length;
  const impayees = d.subs.filter((s) => s.status === "past_due").length;
  const urgent = d.tickets.filter((t) => t.priority === "urgent");

  return (
    <div>
      <div className="kpis">
        <div className="kpi gold"><div className="l">MRR — Revenu mensuel récurrent</div><div className="v mrr">{formatGNF(mrr)} <span style={{ fontSize: 13, color: "var(--gris)" }}>GNF</span></div><div className="d">ARR ≈ <span className="mono">{formatGNF(mrr * 12)}</span></div></div>
        <div className="kpi"><div className="l">Entreprises actives</div><div className="v">{actives}</div><div className="d">{d.companies.length} inscrites · {d.nbEmployes} salariés gérés</div></div>
        <div className="kpi"><div className="l">Essais en cours</div><div className="v">{essais}</div><div className="d">à convertir avant expiration</div></div>
        <div className="kpi"><div className="l">Impayés</div><div className="v">{impayees}</div><div className="d"><Link className="link" href="/admin/abonnements">à relancer →</Link></div></div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Dernières inscriptions</h3><span className="sp" /><Link className="link" href="/admin/entreprises">Toutes →</Link></div>
          <table>
            <tbody>
              <tr><th>Entreprise</th><th>Statut</th><th>Secteur</th><th>Inscrite le</th><th></th></tr>
              {[...d.companies].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((c) => {
                const sub = d.subs.find((s) => s.company_id === c.id);
                return (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><br /><small style={{ color: "var(--gris)" }}>{c.sector ?? ""} · {c.city ?? ""}</small></td>
                    <td>{sub?.status === "trial" ? <span className="bg bg-o">Essai</span> : sub?.status === "past_due" ? <span className="bg bg-r">Impayée</span> : <span className="bg bg-v">Active</span>}</td>
                    <td>{c.sector ?? "—"}</td>
                    <td>{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
                    <td><Link className="btn btn-o btn-sm" href={`/admin/entreprises/${c.id}`}>Ouvrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>À traiter</h3><span className="sp" /><span className="bg bg-r">{impayees + urgent.length}</span></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            {impayees > 0 && (
              <div className="alert rg"><span className="ic">💳</span><div><b>{impayees} impayé{impayees > 1 ? "s" : ""}</b> à relancer. <span className="link" onClick={() => om("mRelance")}>Relancer →</span></div></div>
            )}
            {urgent.map((t) => (
              <div key={t.id} className="alert rg"><span className="ic">🎧</span><div><b>Ticket urgent #{t.number} — {(t.companies as unknown as { name: string } | null)?.name} :</b> « {t.subject} ». <span className="link" onClick={() => om("mTicket")}>Ouvrir →</span></div></div>
            ))}
            {essais > 0 && (
              <div className="alert or"><span className="ic">⏳</span><div><b>{essais} essai{essais > 1 ? "s" : ""} en cours</b> — surveiller les expirations. <span className="link" onClick={() => om("mAnnonce")}>Envoyer un rappel →</span></div></div>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>Derniers incidents</h3><span className="sp" /><Link className="link" href="/admin/monitoring">Monitoring →</Link></div>
        <div className="bd">
          <div className="timeline">
            {d.incidents.map((i, k) => (
              <div key={k} className="tl">
                <small>{new Date(i.started_at).toLocaleString("fr-FR")} · {i.severity}</small>
                <b>{i.title}</b> {i.resolved_at ? "— résolu" : "— en cours"}
              </div>
            ))}
            {d.incidents.length === 0 && <div className="note">Aucun incident.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
