"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

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

  type Promo = (typeof d.promos)[number];
  const colonnesPromos: Colonne<Promo>[] = [
    { id: "code", entete: "Code", triPar: (p) => p.code, classeCell: "mono", cell: (p) => <b>{p.code}</b> },
    { id: "remise", entete: "Remise", triPar: (p) => p.discount_percent, cell: (p) => `-${p.discount_percent} % · ${p.duration_months ? `${p.duration_months} mois` : "illimité"}` },
    { id: "utilisations", entete: "Utilisations", triPar: (p) => p.used_count, classeCell: "mono", cell: (p) => `${p.used_count} / ${p.max_uses ?? "∞"}` },
    { id: "expire", entete: "Expire", triPar: (p) => p.expires_at ?? "", cell: (p) => p.expires_at ? new Date(p.expires_at).toLocaleDateString("fr-FR") : "—" },
    { id: "statut", entete: "Statut", triPar: (p) => (p.active ? 1 : 0), cell: (p) => p.active ? <span className="bg bg-v">Actif</span> : <span className="bg bg-g">Inactif</span> },
  ];

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

      <div style={{ marginTop: 20 }}>
        <DataTable
          titre="Codes promotionnels"
          colonnes={colonnesPromos}
          lignes={d.promos}
          cle={(p) => p.id}
          recherchePar={(p) => p.code}
          placeholderRecherche="Code…"
          actions={<button className="btn btn-o btn-sm" onClick={() => toast("Formulaire de création de code promo ouvert")}>+ Créer un code</button>}
          piedLibelle={(n) => `${n} code${n > 1 ? "s" : ""} promo`}
          messageVide="Aucun code promo."
        />
      </div>
    </div>
  );
}
