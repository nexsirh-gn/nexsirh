"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function Abonnement() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [sub, plans, invoices] = await Promise.all([
      sb.from("subscriptions").select("*, plans(name, price_gnf, max_employees)").maybeSingle(),
      sb.from("plans").select("*").eq("active", true).order("price_gnf", { ascending: true, nullsFirst: false }),
      sb.from("invoices").select("*").order("created_at", { ascending: false }),
    ]);
    return { sub: sub.data, plans: plans.data ?? [], invoices: invoices.data ?? [] };
  });

  if (loading) return <div className="note">Chargement de l’abonnement…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const planActuel = d.sub?.plans as unknown as { name: string; price_gnf: number } | null;

  return (
    <div>
      {d.sub?.status === "trial" ? (
        <div className="alert or" style={{ maxWidth: 860 }}>
          <span className="ic">⏳</span>
          <div><b>Essai gratuit{d.sub.trial_ends_at ? ` — jusqu'au ${new Date(d.sub.trial_ends_at).toLocaleDateString("fr-FR")}` : ""}.</b> Choisissez un plan pour conserver l’accès complet. Vos données sont conservées dans tous les cas.</div>
        </div>
      ) : (
        <div className="alert vt" style={{ maxWidth: 860 }}>
          <span className="ic">✓</span>
          <div><b>Abonnement {planActuel?.name ?? ""} actif</b>{d.sub?.current_period_end ? ` — prochain prélèvement le ${new Date(d.sub.current_period_end).toLocaleDateString("fr-FR")}` : ""}.</div>
        </div>
      )}

      <div className="plans" style={{ maxWidth: 980, marginTop: 16 }}>
        {d.plans.map((p) => (
          <div key={p.id} className={`plan ${p.highlighted ? "hl" : ""}`}>
            {p.highlighted && <span className="tag">Recommandé</span>}
            <h4>{p.name}</h4>
            <div className="px">{p.price_gnf ? <>{formatGNF(p.price_gnf)} <small>GNF / mois</small></> : "Sur devis"}</div>
            <p className="note">{p.max_employees ? `Jusqu'à ${p.max_employees} salariés` : "Multi-dossiers"}</p>
            <ul>{(p.features as string[]).map((f) => <li key={f}>{f}</li>)}</ul>
            {planActuel?.name === p.name ? (
              <button className="btn btn-o" style={{ width: "100%", justifyContent: "center" }} disabled>Plan actuel ✓</button>
            ) : p.price_gnf ? (
              <button className={`btn ${p.highlighted ? "btn-p" : "btn-o"}`} style={{ width: "100%", justifyContent: "center" }} onClick={() => om("mPlan")}>Choisir {p.name}</button>
            ) : (
              <button className="btn btn-o" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Demande envoyée — nous vous recontactons sous 24 h")}>Nous contacter</button>
            )}
          </div>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: 980, marginTop: 20 }}>
        <div className="hd"><h3>Factures</h3></div>
        <table>
          <tbody>
            <tr><th>N°</th><th>Période</th><th className="num">Montant</th><th>Statut</th><th></th></tr>
            {d.invoices.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.number}</td>
                <td>{i.period_start ? `${new Date(i.period_start).toLocaleDateString("fr-FR")} – ${new Date(i.period_end).toLocaleDateString("fr-FR")}` : "—"}</td>
                <td className="gnf">{formatGNF(i.amount_gnf)}</td>
                <td>{i.status === "paid" ? <span className="bg bg-v">Payée</span> : i.status === "failed" ? <span className="bg bg-r">Échec</span> : <span className="bg bg-o">Due</span>}</td>
                <td>{i.status === "paid" && <button className="btn btn-g btn-sm" onClick={() => toast("Facture PDF téléchargée")}>⇩</button>}</td>
              </tr>
            ))}
            {d.invoices.length === 0 && <tr><td colSpan={5} className="note">Aucune facture.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
