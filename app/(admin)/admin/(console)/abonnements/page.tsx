"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function Abonnements() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [subs, plans, invoices, companies] = await Promise.all([
      sb.from("subscriptions").select("*"),
      sb.from("plans").select("id, name, price_gnf"),
      sb.from("invoices").select("*, companies(name)").order("created_at", { ascending: false }),
      sb.from("companies").select("id, name"),
    ]);
    return { subs: subs.data ?? [], plans: plans.data ?? [], invoices: invoices.data ?? [], companies: companies.data ?? [] };
  });

  if (loading) return <div className="note">Chargement des abonnements…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  const prix = new Map(d.plans.map((p) => [p.id, p.price_gnf ?? 0]));
  const nomPlan = new Map(d.plans.map((p) => [p.id, p.name]));
  const nomComp = new Map(d.companies.map((c) => [c.id, c.name]));
  const actifs = d.subs.filter((s) => s.status === "active");
  const mrr = actifs.reduce((t, s) => t + (prix.get(s.plan_id) ?? 0), 0);
  const encaissé = d.invoices.filter((i) => i.status === "paid").reduce((t, i) => t + i.amount_gnf, 0);
  const impayes = d.invoices.filter((i) => ["failed", "due"].includes(i.status));

  return (
    <div>
      <div className="kpis">
        <div className="kpi gold"><div className="l">MRR</div><div className="v mrr" style={{ fontSize: 24 }}>{formatGNF(mrr)}</div><div className="d">GNF · {actifs.length} abonnements payants</div></div>
        <div className="kpi"><div className="l">Encaissé (total)</div><div className="v">{formatGNF(encaissé)}</div><div className="d">{d.invoices.filter((i) => i.status === "failed").length} paiement(s) en échec</div></div>
        <div className="kpi"><div className="l">Essais en cours</div><div className="v">{d.subs.filter((s) => s.status === "trial").length}</div><div className="d">à convertir</div></div>
        <div className="kpi"><div className="l">Impayés</div><div className="v">{impayes.length}</div><div className="d">relances à envoyer</div></div>
      </div>

      <div className="panel">
        <div className="hd"><h3>Paiements &amp; impayés</h3></div>
        <table>
          <tbody>
            <tr><th>Entreprise</th><th>N° facture</th><th className="num">Montant</th><th>Période</th><th>Statut</th><th></th></tr>
            {d.invoices.map((i) => (
              <tr key={i.id}>
                <td><b>{(i.companies as unknown as { name: string } | null)?.name ?? "—"}</b></td>
                <td className="mono">{i.number}</td>
                <td className="gnf">{formatGNF(i.amount_gnf)}</td>
                <td>{i.period_start ? `${new Date(i.period_start).toLocaleDateString("fr-FR")} – ${new Date(i.period_end).toLocaleDateString("fr-FR")}` : "—"}</td>
                <td>{i.status === "paid" ? <span className="bg bg-v">Payée</span> : i.status === "failed" ? <span className="bg bg-r">Échec</span> : <span className="bg bg-o">Due</span>}</td>
                <td>{i.status !== "paid"
                  ? <><button className="btn btn-p btn-sm" onClick={() => om("mRelance")}>Relancer</button>{" "}<button className="btn btn-o btn-sm" onClick={() => toast("Paiement marqué comme reçu ✓ (virement)")}>✓ Reçu</button></>
                  : <button className="btn btn-g btn-sm" onClick={() => toast("Facture PDF téléchargée")}>⇩</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>Souscriptions</h3></div>
        <table>
          <tbody>
            <tr><th>Entreprise</th><th>Plan</th><th>Statut</th><th>Fin de période / essai</th><th className="num">Échecs</th><th></th></tr>
            {d.subs.map((s) => (
              <tr key={s.id}>
                <td><b>{nomComp.get(s.company_id)}</b></td>
                <td>{nomPlan.get(s.plan_id) ?? "Essai"}</td>
                <td>{s.status === "active" ? <span className="bg bg-v">Actif</span> : s.status === "trial" ? <span className="bg bg-o">Essai</span> : s.status === "past_due" ? <span className="bg bg-r">Impayé</span> : <span className="bg bg-g">{s.status}</span>}</td>
                <td>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("fr-FR") : s.trial_ends_at ? `essai → ${new Date(s.trial_ends_at).toLocaleDateString("fr-FR")}` : "—"}</td>
                <td className="gnf mono">{s.failed_payments || "—"}</td>
                <td><Link className="btn btn-g btn-sm" href={`/admin/entreprises/${s.company_id}`}>Fiche</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
