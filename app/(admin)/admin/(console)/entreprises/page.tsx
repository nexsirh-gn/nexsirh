"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

export default function Entreprises() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [companies, subs, plans, emps, profils] = await Promise.all([
      sb.from("companies").select("id, name, nif, sector, city, status"),
      sb.from("subscriptions").select("company_id, status, plan_id"),
      sb.from("plans").select("id, name, price_gnf"),
      sb.from("employees").select("id, company_id"),
      sb.from("profiles").select("id, company_id"),
    ]);
    return {
      companies: companies.data ?? [], subs: subs.data ?? [], plans: plans.data ?? [],
      emps: emps.data ?? [], profils: profils.data ?? [],
    };
  });

  if (loading) return <div className="note">Chargement des entreprises…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  const lignes = d.companies.map((c) => {
    const sub = d.subs.find((s) => s.company_id === c.id);
    const plan = d.plans.find((p) => p.id === sub?.plan_id);
    return {
      ...c,
      subStatus: c.status === "suspended" ? "suspended" : (sub?.status ?? "trial"),
      planNom: plan?.name ?? "Essai",
      mrr: sub?.status === "active" ? plan?.price_gnf ?? 0 : 0,
      nbSalaries: d.emps.filter((e) => e.company_id === c.id).length,
      nbUsers: d.profils.filter((p) => p.company_id === c.id).length,
    };
  });
  const n = (s: string) => lignes.filter((l) => l.subStatus === s).length;
  type Ligne = (typeof lignes)[number];

  const colonnes: Colonne<Ligne>[] = [
    {
      id: "name", entete: "Entreprise", triPar: (c) => c.name,
      cell: (c) => <><b>{c.name}</b><br /><small style={{ color: "var(--gris)" }}>{c.nif ? `NIF ${c.nif} · ` : ""}{c.sector ?? ""} · {c.city ?? ""}</small></>,
    },
    { id: "plan", entete: "Plan", triPar: (c) => c.planNom, cell: (c) => <span className={`bg ${c.planNom === "Essai" ? "bg-o" : "bg-v"}`}>{c.planNom}</span> },
    { id: "salaries", entete: "Salariés", num: true, triPar: (c) => c.nbSalaries, classeCell: "gnf mono", cell: (c) => c.nbSalaries },
    { id: "users", entete: "Utilisateurs", num: true, triPar: (c) => c.nbUsers, classeCell: "gnf mono", cell: (c) => c.nbUsers },
    { id: "mrr", entete: "MRR (GNF)", num: true, triPar: (c) => c.mrr, classeCell: "gnf", cell: (c) => c.mrr ? formatGNF(c.mrr) : "—" },
    {
      id: "statut", entete: "Statut", triPar: (c) => c.subStatus,
      cell: (c) => c.subStatus === "active" ? <span className="bg bg-v">Active</span>
        : c.subStatus === "trial" ? <span className="bg bg-o">Essai</span>
        : c.subStatus === "suspended" ? <span className="bg bg-g">Suspendue</span>
        : <span className="bg bg-r">Impayée</span>,
    },
    {
      id: "actions", entete: "", classeCell: "nowrap",
      cell: (c) => <>
        {c.subStatus === "past_due" && <><button className="btn btn-o btn-sm" onClick={() => om("mRelance")}>Relancer</button>{" "}</>}
        <Link className="btn btn-o btn-sm" href={`/admin/entreprises/${c.id}`}>Ouvrir</Link>
      </>,
    },
  ];

  return (
    <div>
      <DataTable
        colonnes={colonnes}
        lignes={lignes}
        cle={(c) => c.id}
        recherchePar={(c) => `${c.name} ${c.nif ?? ""} ${c.sector ?? ""} ${c.city ?? ""}`}
        placeholderRecherche="Nom, NIF, secteur, ville…"
        filtres={[
          { id: "toutes", label: "Toutes", n: lignes.length },
          { id: "active", label: "Actives", n: n("active") },
          { id: "trial", label: "Essais", n: n("trial") },
          { id: "past_due", label: "Impayées", n: n("past_due") },
          { id: "suspended", label: "Suspendues", n: n("suspended") },
        ]}
        filtrePredicat={(c, f) => f === "toutes" || c.subStatus === f}
        actions={<>
          <button className="btn btn-o btn-sm" onClick={() => toast("Export Excel des entreprises généré")}>⇩ Exporter</button>
          <button className="btn btn-p btn-sm" onClick={() => om("mNouvelleEntreprise")}>+ Créer une entreprise</button>
        </>}
        piedLibelle={() => `${lignes.length} entreprises · ${lignes.reduce((s, l) => s + l.nbSalaries, 0)} salariés gérés au total`}
        messageVide="Aucune entreprise ne correspond au filtre."
      />
    </div>
  );
}
