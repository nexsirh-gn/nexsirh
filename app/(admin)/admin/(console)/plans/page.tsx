"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function Plans() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [plans, promos, subs] = await Promise.all([
      sb.from("plans").select("*").order("price_gnf", { ascending: true, nullsFirst: false }),
      sb.from("promo_codes").select("*").order("code"),
      sb.from("subscriptions").select("plan_id, status"),
    ]);
    return { plans: plans.data ?? [], promos: promos.data ?? [], subs: subs.data ?? [] };
  });

  if (loading) return <div className="note">Chargement des plans…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const nbClients = (planId: string) => d.subs.filter((s) => s.plan_id === planId && s.status === "active").length;

  return (
    <div>
      <div className="tools">
        <span className="note">Les modifications s’appliquent aux <b>nouveaux abonnements</b> ; les clients existants conservent leur tarif (grandfathering).</span>
        <span className="sp" />
        <button className="btn btn-p btn-sm" onClick={() => om("mPlanEdit")}>+ Nouveau plan</button>
      </div>

      <div className="plans">
        {d.plans.map((p) => (
          <div key={p.id} className={`plan ${p.highlighted ? "hl" : ""}`}>
            {p.highlighted && <span className="tag">Populaire</span>}
            <h4>{p.name}</h4>
            <div className="px">{p.price_gnf ? <>{formatGNF(p.price_gnf)} <small>GNF / mois</small></> : "Sur devis"}</div>
            <p className="note">{p.max_employees ? `≤ ${p.max_employees} salariés` : "Multi-dossiers"} · {nbClients(p.id)} client{nbClients(p.id) > 1 ? "s" : ""} actif{nbClients(p.id) > 1 ? "s" : ""}</p>
            <ul>{(p.features as string[]).map((f) => <li key={f}>{f}</li>)}</ul>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-o btn-sm" style={{ flex: 1 }} onClick={() => om("mPlanEdit")}>✎ Modifier</button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="hd"><h3>Codes promotionnels</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Formulaire de création de code promo ouvert")}>+ Créer un code</button></div>
        <table>
          <tbody>
            <tr><th>Code</th><th>Remise</th><th>Utilisations</th><th>Expire</th><th>Statut</th></tr>
            {d.promos.map((p) => (
              <tr key={p.id}>
                <td className="mono"><b>{p.code}</b></td>
                <td>-{p.discount_percent} % · {p.duration_months ? `${p.duration_months} mois` : "illimité"}</td>
                <td className="mono">{p.used_count} / {p.max_uses ?? "∞"}</td>
                <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString("fr-FR") : "—"}</td>
                <td>{p.active ? <span className="bg bg-v">Actif</span> : <span className="bg bg-g">Inactif</span>}</td>
              </tr>
            ))}
            {d.promos.length === 0 && <tr><td colSpan={5} className="note">Aucun code promo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
