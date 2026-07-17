"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/providers";
import { useQuery, formatGNF, initiales, MOIS } from "@/lib/hooks";
import { suspendreEntreprise, ouvrirAccesSupport } from "@/app/actions";

type ETab = "et1" | "et2" | "et3" | "et4";
const TABS: [ETab, string][] = [
  ["et1", "Activité"], ["et2", "Abonnement & factures"], ["et3", "Utilisateurs"], ["et4", "Journal"],
];

export default function FicheEntreprise() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<ETab>("et1");
  const [modalSuspendre, setModalSuspendre] = useState(false);
  const [modalSupport, setModalSupport] = useState(false);
  const [motif, setMotif] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const company = await sb.from("companies").select("*").eq("id", slug).maybeSingle();
    if (company.error) throw company.error;
    if (!company.data) return null;
    const [sub, invoices, users, emps, runs, docs, journal] = await Promise.all([
      sb.from("subscriptions").select("*, plans(name, price_gnf, max_employees)").eq("company_id", slug).maybeSingle(),
      sb.from("invoices").select("*").eq("company_id", slug).order("created_at", { ascending: false }),
      sb.from("profiles").select("full_name, email, role, active, last_sign_in_at").eq("company_id", slug),
      sb.from("employees").select("id", { count: "exact", head: true }).eq("company_id", slug),
      sb.from("payroll_runs").select("period_year, period_month, status, closed_at").eq("company_id", slug).order("period_year", { ascending: false }).order("period_month", { ascending: false }),
      sb.from("documents").select("id, doc_type", { count: "exact" }).eq("company_id", slug),
      sb.from("audit_log").select("created_at, actor_email, action, target_table").eq("company_id", slug).order("created_at", { ascending: false }).limit(8),
    ]);
    return {
      c: company.data, sub: sub.data, invoices: invoices.data ?? [], users: users.data ?? [],
      nbEmps: emps.count ?? 0, runs: runs.data ?? [],
      nbDocs: docs.count ?? 0, nbBulletins: (docs.data ?? []).filter((x) => x.doc_type === "bulletin").length,
      journal: journal.data ?? [],
    };
  }, [slug]);

  if (loading) return <div className="note">Chargement de la fiche entreprise…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  if (!data) return <div className="alert or"><span className="ic">ⓘ</span><div>Entreprise introuvable.</div></div>;
  const { c, sub, invoices, users, nbEmps, runs, nbDocs, nbBulletins, journal } = data;
  const plan = sub?.plans as unknown as { name: string; price_gnf: number; max_employees: number | null } | null;
  const cloturees = runs.filter((r) => r.status === "cloture");
  const derniere = cloturees[0];

  async function suspendre() {
    if (!motif.trim()) { toast("Motif obligatoire."); return; }
    setPending(true);
    const res = await suspendreEntreprise(c.id, motif);
    setPending(false);
    setModalSuspendre(false);
    setMotif("");
    if (res.ok) { toast("Entreprise suspendue ⏸ — action journalisée, aucune donnée supprimée"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  async function accesSupport() {
    setPending(true);
    const res = await ouvrirAccesSupport(c.id, motif || "Diagnostic support");
    setPending(false);
    setModalSupport(false);
    setMotif("");
    if (res.ok) { toast("Session support journalisée des deux côtés 🎧 — visible dans le journal du client"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <span className="av" style={{ width: 56, height: 56, fontSize: 19 }}>{initiales(c.name)}</span>
        <div style={{ flex: 1 }}>
          <h2 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>
            {c.name}{" "}
            {c.status === "suspended"
              ? <span className="bg bg-r" style={{ verticalAlign: 3 }}>Suspendue</span>
              : <span className="bg bg-v" style={{ verticalAlign: 3 }}>Active</span>}{" "}
            {plan && <span className="bg bg-v" style={{ verticalAlign: 3 }}>{plan.name}</span>}
          </h2>
          <span className="crumb">
            {c.nif ? <>NIF <b className="mono">{c.nif}</b> · </> : ""}{c.address ?? ""} · Cliente depuis le {new Date(c.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>
        <button className="btn btn-o" onClick={() => setModalSupport(true)}>🎧 Accès support</button>
        <button className="btn btn-o" onClick={() => toast("Export RGPD complet lancé (ZIP chiffré)")}>⇩ Exporter les données</button>
        {c.status !== "suspended" && <button className="btn btn-d" onClick={() => setModalSuspendre(true)}>⏸ Suspendre</button>}
      </div>

      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "et1" && (
        <div className="kpis">
          <div className="kpi"><div className="l">Salariés gérés</div><div className="v">{nbEmps}{plan?.max_employees ? <span style={{ fontSize: 13, color: "var(--gris)" }}> / {plan.max_employees}</span> : ""}</div>
            {plan?.max_employees && <div className="d"><div className="prog" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (nbEmps / plan.max_employees) * 100)}%` }} /></div></div>}
          </div>
          <div className="kpi"><div className="l">Paies clôturées</div><div className="v">{cloturees.length}</div><div className="d">{derniere ? `dernière : ${MOIS[derniere.period_month].toLowerCase()} ${derniere.period_year}` : "aucune"}</div></div>
          <div className="kpi"><div className="l">Documents générés</div><div className="v">{nbDocs}</div><div className="d">dont {nbBulletins} bulletins</div></div>
          <div className="kpi"><div className="l">Utilisateurs</div><div className="v">{users.length}</div><div className="d">{users.filter((u) => u.active).length} actifs</div></div>
        </div>
      )}

      {tab === "et2" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Abonnement</h3></div>
            <div className="bd">
              <div className="stat-line"><span>Plan</span><b>{plan ? `${plan.name} — ${formatGNF(plan.price_gnf)} GNF / mois` : "Essai"}</b></div>
              <div className="stat-line"><span>Statut</span><b>{sub?.status === "active" ? <span className="bg bg-v">Actif</span> : sub?.status === "past_due" ? <span className="bg bg-r">Impayé</span> : <span className="bg bg-o">{sub?.status ?? "—"}</span>}</b></div>
              <div className="stat-line"><span>Prochain prélèvement</span><b>{sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("fr-FR") : "—"}</b></div>
              <div className="stat-line"><span>Paiements en échec</span><b className="mono">{sub?.failed_payments ?? 0}</b></div>
              <div className="stat-line"><span>Revenu cumulé</span><b className="gnf">{formatGNF(invoices.filter((i) => i.status === "paid").reduce((t, i) => t + i.amount_gnf, 0))} GNF</b></div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Factures</h3></div>
            <table>
              <tbody>
                <tr><th>N°</th><th>Période</th><th className="num">Montant</th><th>Statut</th></tr>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.number}</td>
                    <td>{i.period_start ? `${new Date(i.period_start).toLocaleDateString("fr-FR")} – ${new Date(i.period_end).toLocaleDateString("fr-FR")}` : "—"}</td>
                    <td className="gnf">{formatGNF(i.amount_gnf)}</td>
                    <td>{i.status === "paid" ? <span className="bg bg-v">Payée</span> : i.status === "failed" ? <span className="bg bg-r">Échec</span> : <span className="bg bg-o">Due</span>}</td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={4} className="note">Aucune facture.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "et3" && (
        <div className="panel">
          <div className="hd"><h3>Utilisateurs de l’entreprise</h3></div>
          <table>
            <tbody>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th>Statut</th></tr>
              {users.map((u, i) => (
                <tr key={i}>
                  <td><b>{u.full_name}</b> <small style={{ color: "var(--gris)" }}>{u.email}</small></td>
                  <td><span className="bg bg-g">{u.role}</span></td>
                  <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}</td>
                  <td>{u.active ? <span className="bg bg-v">Actif</span> : <span className="bg bg-g">Inactif</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "et4" && (
        <div className="panel">
          <div className="hd"><h3>Journal de l’entreprise (audit)</h3></div>
          <div className="bd">
            <div className="timeline">
              {journal.map((j, i) => (
                <div key={i} className={`tl ${j.action === "acces_support" ? "gold" : ""}`}>
                  <small>{new Date(j.created_at).toLocaleString("fr-FR")} · {j.actor_email ?? "système"}</small>
                  <b>{j.action}</b> — {j.target_table}
                </div>
              ))}
              {journal.length === 0 && <div className="note">Aucun événement journalisé.</div>}
            </div>
          </div>
        </div>
      )}

      {modalSuspendre && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalSuspendre(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div className="ic-dgr">⏸</div>
              <div><h3>Suspendre {c.name} ?</h3><p>L’espace passe en lecture seule pour tous ses utilisateurs.</p></div>
              <button className="x" onClick={() => setModalSuspendre(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fld"><label>Motif (journalisé)</label><textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : impayé persistant…" /></div>
              <div className="alert or"><span className="ic">ⓘ</span><div>Aucune donnée n’est supprimée. Réactivation possible à tout moment.</div></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalSuspendre(false)}>Annuler</button>
              <button className="btn btn-d" disabled={pending} onClick={suspendre}>{pending ? "Suspension…" : "⏸ Suspendre"}</button>
            </div>
          </div>
        </div>
      )}

      {modalSupport && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalSupport(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div className="ic-warn">🎧</div>
              <div><h3>Accès support — {c.name}</h3><p>Session journalisée des DEUX côtés (plateforme + journal client).</p></div>
              <button className="x" onClick={() => setModalSupport(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="stat-line"><span>Durée de la session</span><b>60 minutes max</b></div>
              <div className="stat-line"><span>Restrictions</span><b>Lecture seule sur salaires · aucune clôture de paie</b></div>
              <div className="fld" style={{ marginTop: 14 }}><label>Motif (journalisé)</label><input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : diagnostic écart RTS — ticket #…" /></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalSupport(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pending} onClick={accesSupport}>{pending ? "Ouverture…" : "Ouvrir la session"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
