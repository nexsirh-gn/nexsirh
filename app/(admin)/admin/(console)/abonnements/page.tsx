"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

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

  type Facture = (typeof d.invoices)[number];
  const nomFactComp = (i: Facture) => (i.companies as unknown as { name: string } | null)?.name ?? "—";
  const colonnesFactures: Colonne<Facture>[] = [
    { id: "entreprise", entete: "Entreprise", triPar: (i) => nomFactComp(i), cell: (i) => <b>{nomFactComp(i)}</b> },
    { id: "number", entete: "N° facture", triPar: (i) => i.number, classeCell: "mono", cell: (i) => i.number },
    { id: "montant", entete: "Montant", num: true, triPar: (i) => i.amount_gnf, classeCell: "gnf", cell: (i) => formatGNF(i.amount_gnf) },
    { id: "periode", entete: "Période", triPar: (i) => i.period_start ?? "", cell: (i) => i.period_start ? `${new Date(i.period_start).toLocaleDateString("fr-FR")} – ${new Date(i.period_end).toLocaleDateString("fr-FR")}` : "—" },
    { id: "statut", entete: "Statut", triPar: (i) => i.status, cell: (i) => i.status === "paid" ? <span className="bg bg-v">Payée</span> : i.status === "failed" ? <span className="bg bg-r">Échec</span> : <span className="bg bg-o">Due</span> },
    {
      id: "actions", entete: "", classeCell: "nowrap",
      cell: (i) => i.status !== "paid"
        ? <><button className="btn btn-p btn-sm" onClick={() => om("mRelance")}>Relancer</button>{" "}<button className="btn btn-o btn-sm" onClick={() => toast("Paiement marqué comme reçu ✓ (virement)")}>✓ Reçu</button></>
        : <button className="btn btn-g btn-sm" onClick={() => toast("Facture PDF téléchargée")}>⇩</button>,
    },
  ];

  type Sub = (typeof d.subs)[number];
  const colonnesSubs: Colonne<Sub>[] = [
    { id: "entreprise", entete: "Entreprise", triPar: (s) => nomComp.get(s.company_id) ?? "", cell: (s) => <b>{nomComp.get(s.company_id)}</b> },
    { id: "plan", entete: "Plan", triPar: (s) => nomPlan.get(s.plan_id) ?? "Essai", cell: (s) => nomPlan.get(s.plan_id) ?? "Essai" },
    { id: "statut", entete: "Statut", triPar: (s) => s.status, cell: (s) => s.status === "active" ? <span className="bg bg-v">Actif</span> : s.status === "trial" ? <span className="bg bg-o">Essai</span> : s.status === "past_due" ? <span className="bg bg-r">Impayé</span> : <span className="bg bg-g">{s.status}</span> },
    { id: "fin", entete: "Fin de période / essai", triPar: (s) => s.current_period_end ?? s.trial_ends_at ?? "", cell: (s) => s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("fr-FR") : s.trial_ends_at ? `essai → ${new Date(s.trial_ends_at).toLocaleDateString("fr-FR")}` : "—" },
    { id: "echecs", entete: "Échecs", num: true, triPar: (s) => s.failed_payments ?? 0, classeCell: "gnf mono", cell: (s) => s.failed_payments || "—" },
    { id: "actions", entete: "", classeCell: "nowrap", cell: (s) => <Link className="btn btn-g btn-sm" href={`/admin/entreprises/${s.company_id}`}>Fiche</Link> },
  ];

  return (
    <div>
      <div className="kpis">
        <div className="kpi gold"><div className="l">MRR</div><div className="v mrr" style={{ fontSize: 24 }}>{formatGNF(mrr)}</div><div className="d">GNF · {actifs.length} abonnements payants</div></div>
        <div className="kpi"><div className="l">Encaissé (total)</div><div className="v">{formatGNF(encaissé)}</div><div className="d">{d.invoices.filter((i) => i.status === "failed").length} paiement(s) en échec</div></div>
        <div className="kpi"><div className="l">Essais en cours</div><div className="v">{d.subs.filter((s) => s.status === "trial").length}</div><div className="d">à convertir</div></div>
        <div className="kpi"><div className="l">Impayés</div><div className="v">{impayes.length}</div><div className="d">relances à envoyer</div></div>
      </div>

      <DataTable
        titre="Paiements & impayés"
        colonnes={colonnesFactures}
        lignes={d.invoices}
        cle={(i) => i.id}
        recherchePar={(i) => `${nomFactComp(i)} ${i.number}`}
        placeholderRecherche="Entreprise, n° facture…"
        piedLibelle={(n) => `${n} facture${n > 1 ? "s" : ""}`}
        messageVide="Aucune facture."
      />

      <div style={{ marginTop: 18 }}>
        <DataTable
          titre="Souscriptions"
          colonnes={colonnesSubs}
          lignes={d.subs}
          cle={(s) => s.id}
          recherchePar={(s) => `${nomComp.get(s.company_id) ?? ""} ${nomPlan.get(s.plan_id) ?? ""}`}
          placeholderRecherche="Entreprise, plan…"
          piedLibelle={(n) => `${n} souscription${n > 1 ? "s" : ""}`}
          messageVide="Aucune souscription."
        />
      </div>
    </div>
  );
}
