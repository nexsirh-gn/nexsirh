"use client";

import Link from "next/link";
import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function Entreprises() {
  const { om } = useModal();
  const toast = useToast();
  const [filtre, setFiltre] = useState<"toutes" | "active" | "trial" | "past_due" | "suspended">("toutes");

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
  const liste = filtre === "toutes" ? lignes : lignes.filter((l) => l.subStatus === filtre);

  return (
    <div>
      <div className="tools">
        <button className={`chip ${filtre === "toutes" ? "on" : ""}`} onClick={() => setFiltre("toutes")}>Toutes · {lignes.length}</button>
        <button className={`chip ${filtre === "active" ? "on" : ""}`} onClick={() => setFiltre("active")}>Actives · {n("active")}</button>
        <button className={`chip ${filtre === "trial" ? "on" : ""}`} onClick={() => setFiltre("trial")}>Essais · {n("trial")}</button>
        <button className={`chip ${filtre === "past_due" ? "on" : ""}`} onClick={() => setFiltre("past_due")}>Impayées · {n("past_due")}</button>
        <button className={`chip ${filtre === "suspended" ? "on" : ""}`} onClick={() => setFiltre("suspended")}>Suspendues · {n("suspended")}</button>
        <span className="sp" />
        <button className="btn btn-o btn-sm" onClick={() => toast("Export Excel des entreprises généré")}>⇩ Exporter</button>
        <button className="btn btn-p btn-sm" onClick={() => om("mNouvelleEntreprise")}>+ Créer une entreprise</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Entreprise</th><th>Plan</th><th className="num">Salariés</th><th className="num">Utilisateurs</th><th className="num">MRR (GNF)</th><th>Statut</th><th></th></tr>
            {liste.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b><br /><small style={{ color: "var(--gris)" }}>{c.nif ? `NIF ${c.nif} · ` : ""}{c.sector ?? ""} · {c.city ?? ""}</small></td>
                <td><span className={`bg ${c.planNom === "Essai" ? "bg-o" : "bg-v"}`}>{c.planNom}</span></td>
                <td className="gnf mono">{c.nbSalaries}</td>
                <td className="gnf mono">{c.nbUsers}</td>
                <td className="gnf">{c.mrr ? formatGNF(c.mrr) : "—"}</td>
                <td>{c.subStatus === "active" ? <span className="bg bg-v">Active</span>
                  : c.subStatus === "trial" ? <span className="bg bg-o">Essai</span>
                  : c.subStatus === "suspended" ? <span className="bg bg-g">Suspendue</span>
                  : <span className="bg bg-r">Impayée</span>}</td>
                <td>
                  {c.subStatus === "past_due" && <><button className="btn btn-o btn-sm" onClick={() => om("mRelance")}>Relancer</button>{" "}</>}
                  <Link className="btn btn-o btn-sm" href={`/admin/entreprises/${c.id}`}>Ouvrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pgn"><span>{lignes.length} entreprises · {lignes.reduce((s, l) => s + l.nbSalaries, 0)} salariés gérés au total</span></div>
      </div>
    </div>
  );
}
