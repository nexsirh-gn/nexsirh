"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/providers";
import { useQuery, formatGNF, initiales } from "@/lib/hooks";
import { creerMouvement, modifierEmploye } from "@/app/actions";

type Tab = "ft1" | "ft2" | "ft3" | "ft4" | "ft5" | "ft6";
const TABS: [Tab, string][] = [
  ["ft1", "Identité"], ["ft2", "Contrat"], ["ft3", "Salaire & primes"],
  ["ft4", "Congés"], ["ft5", "Documents"], ["ft6", "Historique"],
];

export default function FicheEmploye() {
  const { matricule } = useParams<{ matricule: string }>();
  const mat = decodeURIComponent(matricule).toUpperCase();
  const [tab, setTab] = useState<Tab>("ft1");
  const [modalMvt, setModalMvt] = useState(false);
  const [modalDoc, setModalDoc] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [nouveauSalaire, setNouveauSalaire] = useState("");
  const [motif, setMotif] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const emp = await sb.from("employees")
      .select("*, positions(title), departments(name), manager:manager_id(first_name, last_name)")
      .eq("matricule", mat).maybeSingle();
    if (emp.error) throw emp.error;
    if (!emp.data) return null;
    const id = emp.data.id;
    const [comp, solde, conges, docs, mouvements, prets, slips] = await Promise.all([
      sb.from("employee_compensation").select("*").eq("employee_id", id).maybeSingle(),
      sb.from("leave_balances").select("*").eq("employee_id", id).eq("year", 2026).maybeSingle(),
      sb.from("leave_requests").select("*").eq("employee_id", id).order("start_date", { ascending: false }),
      sb.from("documents").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
      sb.from("employee_movements").select("*").eq("employee_id", id).order("effective_date", { ascending: false }),
      sb.from("loans").select("*").eq("employee_id", id).eq("status", "actif"),
      sb.from("payslips").select("id, payroll_runs(period_year, period_month)").eq("employee_id", id),
    ]);
    // Correspondance période ("2026-06") → id du bulletin, pour le lien PDF
    const bulletinParPeriode = new Map(
      (slips.data ?? []).map((s) => {
        const r = s.payroll_runs as unknown as { period_year: number; period_month: number };
        return [`${r.period_year}-${String(r.period_month).padStart(2, "0")}`, s.id];
      })
    );
    return {
      emp: emp.data, comp: comp.data, solde: solde.data,
      conges: conges.data ?? [], docs: docs.data ?? [], mouvements: mouvements.data ?? [], prets: prets.data ?? [],
      anciennete: Math.floor((Date.now() - new Date(emp.data.hire_date).getTime()) / (365.25 * 86400e3)),
      bulletinParPeriode,
    };
  }, [mat]);

  if (loading) return <div className="note">Chargement de la fiche…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  if (!data) return <div className="alert or"><span className="ic">ⓘ</span><div>Salarié {mat} introuvable (ou accès non autorisé).</div></div>;
  const { emp, comp, solde, conges, docs, mouvements, prets, anciennete, bulletinParPeriode } = data;
  const nom = `${emp.last_name} ${emp.first_name}`;
  const manager = emp.manager as unknown as { first_name: string; last_name: string } | null;
  const brut = comp
    ? comp.base_salary + comp.seniority_bonus + comp.meal_allowance + comp.housing_allowance + comp.transport_allowance + comp.cost_of_living_allowance + comp.other_bonuses
    : null;

  async function enregistrerMouvement() {
    if (!nouveauSalaire || !motif.trim()) { toast("Nouveau salaire et motif obligatoires."); return; }
    setPending(true);
    const res = await creerMouvement({
      employeeId: emp.id, type: "augmentation",
      ancienne: String(comp?.base_salary ?? ""), nouvelle: nouveauSalaire.replace(/\D/g, ""),
      motif, dateEffet: new Date().toISOString().slice(0, 10),
    });
    setPending(false);
    setModalMvt(false);
    if (res.ok) { toast("Mouvement enregistré — salaire appliqué et tracé dans l’audit ✓"); setNouveauSalaire(""); setMotif(""); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  const TYPE_MVT: Record<string, string> = {
    augmentation: "Augmentation de salaire", promotion: "Promotion", mutation: "Mutation",
    suspension: "Suspension", depart: "Départ", embauche: "Embauche", pret: "Prêt accordé", autre: "Autre",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <span className="av" style={{ width: 56, height: 56, fontSize: 19 }}>{initiales(nom)}</span>
        <div style={{ flex: 1 }}>
          <h2 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>
            {nom}{" "}
            {emp.status === "actif" ? <span className="bg bg-v" style={{ verticalAlign: 3 }}>Actif</span>
              : emp.status === "essai" ? <span className="bg bg-o" style={{ verticalAlign: 3 }}>Période d’essai</span>
              : <span className="bg bg-g" style={{ verticalAlign: 3 }}>Sorti</span>}
          </h2>
          <span className="crumb">
            {(emp.positions as unknown as { title: string } | null)?.title ?? "—"} · {(emp.departments as unknown as { name: string } | null)?.name ?? "—"} · Matricule{" "}
            <b className="mono">{emp.matricule}</b> · {emp.contract_type} depuis le {new Date(emp.hire_date).toLocaleDateString("fr-FR")} — {anciennete} an{anciennete > 1 ? "s" : ""} d’ancienneté
          </span>
        </div>
        <button className="btn btn-o" onClick={() => setModalMvt(true)}>⇄ Nouveau mouvement</button>
        <button className="btn btn-o" onClick={() => setModalDoc(true)}>📄 Générer un document</button>
        <button className="btn btn-p" onClick={() => { setEditForm({}); setModalEdit(true); }}>✎ Modifier</button>
      </div>

      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "ft1" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>État civil</h3></div>
            <div className="bd fgrid">
              <div><label>Civilité</label><div>{emp.civility ?? "—"}</div></div>
              <div><label>Nationalité</label><div>{emp.nationality ?? "—"}</div></div>
              <div><label>Nom</label><div><b>{emp.last_name}</b></div></div>
              <div><label>Prénom</label><div><b>{emp.first_name}</b></div></div>
              <div><label>Naissance</label><div>{new Date(emp.birth_date).toLocaleDateString("fr-FR")}{emp.birth_place ? ` · ${emp.birth_place}` : ""}</div></div>
              <div><label>Situation</label><div>{emp.marital_status ?? "—"}{emp.children_count ? ` · ${emp.children_count} enfant(s)` : ""}</div></div>
              <div><label>N° Sécurité sociale</label><div className="mono">{emp.cnss_number ?? "—"}</div></div>
              <div><label>Pièce d’identité</label><div>{emp.id_doc_type ?? "—"} {emp.id_doc_number ? <span className="mono">{emp.id_doc_number}</span> : ""}{emp.id_doc_expiry ? ` — exp. ${new Date(emp.id_doc_expiry).toLocaleDateString("fr-FR")}` : ""}</div></div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Coordonnées &amp; urgence</h3></div>
            <div className="bd fgrid">
              <div className="w"><label>Adresse</label><div>{emp.address ?? "—"}</div></div>
              <div><label>Téléphone</label><div className="mono">{emp.phone ?? "—"}</div></div>
              <div><label>Email</label><div>{emp.email ?? "—"}</div></div>
              <div className="w"><label>Contact d’urgence</label><div>{emp.emergency_contact_name ?? "—"}{emp.emergency_contact_phone ? <> — <span className="mono">{emp.emergency_contact_phone}</span></> : ""}</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === "ft2" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Contrat en cours</h3><span className="sp" /><span className={`bg ${emp.contract_type === "CDD" ? "bg-r" : "bg-v"}`}>{emp.contract_type}</span></div>
            <div className="bd fgrid">
              <div><label>Date d’embauche</label><div>{new Date(emp.hire_date).toLocaleDateString("fr-FR")}</div></div>
              <div><label>{emp.contract_type === "CDD" ? "Fin de contrat" : "Période d’essai"}</label>
                <div>{emp.contract_type === "CDD" && emp.contract_end_date
                  ? new Date(emp.contract_end_date).toLocaleDateString("fr-FR")
                  : emp.trial_end_date ? `Jusqu'au ${new Date(emp.trial_end_date).toLocaleDateString("fr-FR")}` : "Validée"}</div></div>
              <div><label>Catégorie</label><div>{emp.category ?? "—"}</div></div>
              <div><label>Qualification</label><div>{emp.qualification ?? "—"}</div></div>
              <div><label>Supérieur (N+1)</label><div>{manager ? `${manager.last_name} ${manager.first_name}` : "—"}</div></div>
              <div><label>Horaire mensuel</label><div className="mono">{Number(emp.monthly_hours).toLocaleString("fr-FR")} h</div></div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Banque &amp; paiement</h3></div>
            <div className="bd fgrid">
              <div><label>Mode</label><div>{emp.payment_mode ?? "—"}</div></div>
              <div><label>Banque</label><div>{emp.bank_name ?? "—"}</div></div>
              <div className="w"><label>N° de compte</label><div className="mono">{emp.bank_account ?? "—"}</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === "ft3" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Rémunération mensuelle</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => setModalMvt(true)}>Modifier via mouvement</button></div>
            <div className="bd">
              {comp ? (
                <>
                  <div className="stat-line"><span>Salaire de base</span><b className="gnf">{formatGNF(comp.base_salary)}</b></div>
                  <div className="stat-line"><span>Prime d’ancienneté</span><b className="gnf">{formatGNF(comp.seniority_bonus)}</b></div>
                  <div className="stat-line"><span>Prime de repas</span><b className="gnf">{formatGNF(comp.meal_allowance)}</b></div>
                  <div className="stat-line"><span>Indemnité de logement <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">{formatGNF(comp.housing_allowance)}</b></div>
                  <div className="stat-line"><span>Indemnité de transport <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">{formatGNF(comp.transport_allowance)}</b></div>
                  <div className="stat-line"><span>Indemnité de cherté de vie <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">{formatGNF(comp.cost_of_living_allowance)}</b></div>
                  <div className="stat-line" style={{ borderTop: "2px solid var(--encre)", marginTop: 6, paddingTop: 12 }}>
                    <span><b>Brut mensuel théorique</b></span><b className="gnf" style={{ fontSize: 16 }}>{formatGNF(brut)} GNF</b>
                  </div>
                </>
              ) : (
                <div className="alert or"><span className="ic">🔒</span><div>Rémunération non visible pour votre rôle (règle : le manager ne voit jamais les salaires).</div></div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Retenues récurrentes</h3></div>
            <div className="bd">
              {prets.map((p) => (
                <div key={p.id}>
                  <div className="stat-line">
                    <span>{p.loan_type === "pret" ? "Prêt personnel" : "Avance"} <small style={{ color: "var(--gris)" }}>— {p.installments_paid}/{p.installments_total} mensualités</small></span>
                    <b className="gnf" style={{ color: "var(--rouge)" }}>− {formatGNF(p.monthly_amount)}</b>
                  </div>
                  <div style={{ margin: "10px 0 16px" }}>
                    <div className="prog"><i style={{ width: `${(p.installments_paid / p.installments_total) * 100}%` }} /></div>
                    <small className="note">Reste à rembourser : <b className="mono">{formatGNF(p.total_amount - p.installments_paid * p.monthly_amount)} GNF</b></small>
                  </div>
                </div>
              ))}
              {prets.length === 0 && <p className="note">Aucune retenue récurrente.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "ft4" && (
        <div>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kpi"><div className="l">Droits acquis 2026</div><div className="v">{solde ? `${(solde.entitled_days + solde.seniority_bonus_days).toLocaleString("fr-FR")} j` : "—"}</div><div className="d">dont <b>{solde?.seniority_bonus_days ?? 0} j</b> d’ancienneté</div></div>
            <div className="kpi"><div className="l">Jours pris</div><div className="v">{solde ? `${solde.taken_days} j` : "—"}</div><div className="d">congés annuels décomptés</div></div>
            <div className="kpi gold"><div className="l">Solde disponible</div><div className="v">{solde ? `${(solde.entitled_days + solde.seniority_bonus_days + solde.carryover_days - solde.taken_days).toLocaleString("fr-FR")} j` : "—"}</div><div className="d">+ report 2025 : <b>{solde?.carryover_days ?? 0} j</b></div></div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Historique des absences</h3></div>
            <table>
              <tbody>
                <tr><th>Type</th><th>Période</th><th className="num">Jours ouvr.</th><th>Statut</th></tr>
                {conges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.leave_type_code}</td>
                    <td>{new Date(c.start_date).toLocaleDateString("fr-FR")} – {new Date(c.end_date).toLocaleDateString("fr-FR")}</td>
                    <td className="gnf mono">{c.working_days}</td>
                    <td>{c.status === "approuve" ? <span className="bg bg-v">Approuvée</span>
                      : c.status === "refuse" ? <span className="bg bg-r">Refusée</span>
                      : <span className="bg bg-o">En attente</span>}</td>
                  </tr>
                ))}
                {conges.length === 0 && <tr><td colSpan={4} className="note">Aucune absence.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ft5" && (
        <div className="panel">
          <div className="hd"><h3>Documents du salarié</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => setModalDoc(true)}>+ Générer</button></div>
          <table>
            <tbody>
              <tr><th>Document</th><th>Période / objet</th><th>Généré le</th><th></th></tr>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td>📄 {doc.title}</td>
                  <td>{doc.period ?? "—"}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                  <td>{doc.doc_type === "bulletin" && doc.period && bulletinParPeriode.has(doc.period)
                    ? <a className="btn btn-g btn-sm" href={`/api/documents/bulletin/${bulletinParPeriode.get(doc.period)}`}
                        onClick={() => toast("Téléchargement du bulletin PDF…")}>⇩ PDF</a>
                    : <button className="btn btn-g btn-sm" onClick={() => toast("PDF de ce type de document : à venir")}>⇩ PDF</button>}</td>
                </tr>
              ))}
              {docs.length === 0 && <tr><td colSpan={4} className="note">Aucun document.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ft6" && (
        <div className="panel">
          <div className="hd"><h3>Historique de carrière (audit)</h3></div>
          <div className="bd">
            <div className="timeline">
              {mouvements.map((m) => (
                <div key={m.id} className={`tl ${m.movement_type === "augmentation" ? "gold" : ""}`}>
                  <small>{new Date(m.effective_date).toLocaleDateString("fr-FR")}</small>
                  <b>{TYPE_MVT[m.movement_type] ?? m.movement_type}</b>
                  {m.old_value && m.new_value ? <> — <span className="mono">{formatGNF(Number(m.old_value))} → {formatGNF(Number(m.new_value))} GNF</span></> : ""}
                  {m.reason ? `. Motif : ${m.reason}.` : ""}
                </div>
              ))}
              <div className="tl"><small>{new Date(emp.hire_date).toLocaleDateString("fr-FR")} · système</small><b>Embauche</b> — {emp.contract_type}.</div>
            </div>
          </div>
        </div>
      )}

      {/* Modale modification de fiche — écriture réelle (hors salaire) */}
      {modalEdit && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalEdit(false)}>
          <div className="mdl lg">
            <div className="mh">
              <div>
                <h3>✎ Modifier la fiche — {nom}</h3>
                <p>Matricule <b className="mono">{emp.matricule}</b> (non modifiable) · toute modification est tracée dans l’audit.</p>
              </div>
              <button className="x" onClick={() => setModalEdit(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                {/* Champs à choix — mêmes valeurs que l'assistant de création (nouvel-employe) */}
                <div className="fld">
                  <label>Civilité</label>
                  <select
                    value={editForm.civility ?? emp.civility ?? "M."}
                    onChange={(e) => setEditForm({ ...editForm, civility: e.target.value })}
                  >
                    {["M.", "Mme", "Mlle"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label>Situation matrimoniale</label>
                  <select
                    value={editForm.marital_status ?? emp.marital_status ?? "Célibataire"}
                    onChange={(e) => setEditForm({ ...editForm, marital_status: e.target.value })}
                  >
                    {["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label>Pièce d’identité</label>
                  <select
                    value={editForm.id_doc_type ?? emp.id_doc_type ?? "CNI"}
                    onChange={(e) => setEditForm({ ...editForm, id_doc_type: e.target.value })}
                  >
                    {["CNI", "Passeport", "Carte de séjour", "Permis de conduire"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {/* Champs texte libres */}
                {([
                  ["last_name", "Nom", emp.last_name],
                  ["first_name", "Prénom", emp.first_name],
                  ["nationality", "Nationalité", emp.nationality],
                  ["birth_place", "Lieu de naissance", emp.birth_place],
                  ["children_count", "Nombre d’enfants", emp.children_count != null ? String(emp.children_count) : ""],
                  ["id_doc_number", "N° pièce d’identité", emp.id_doc_number],
                  ["id_doc_expiry", "Expiration pièce (AAAA-MM-JJ)", emp.id_doc_expiry],
                  ["phone", "Téléphone", emp.phone],
                  ["email", "Email", emp.email],
                  ["cnss_number", "N° CNSS", emp.cnss_number],
                  ["address", "Adresse", emp.address],
                  ["bank_name", "Banque", emp.bank_name],
                  ["bank_account", "N° de compte", emp.bank_account],
                  ["emergency_contact_name", "Contact d’urgence", emp.emergency_contact_name],
                  ["emergency_contact_phone", "Téléphone d’urgence", emp.emergency_contact_phone],
                ] as [string, string, string | null][]).map(([champ, libelle, valeur]) => (
                  <div key={champ} className={`fld ${champ === "address" ? "w" : ""}`}>
                    <label>{libelle}</label>
                    <input
                      type={champ === "children_count" ? "number" : champ === "id_doc_expiry" ? "date" : "text"}
                      min={champ === "children_count" ? 0 : undefined}
                      value={editForm[champ] ?? valeur ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, [champ]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="alert or" style={{ marginTop: 8 }}>
                <span className="ic">🔒</span>
                <div>Le <b>salaire de base et les primes</b> ne se modifient pas ici : utilisez « Nouveau mouvement » pour garder la traçabilité.</div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalEdit(false)}>Annuler</button>
              <button className="btn btn-o" onClick={() => { setModalEdit(false); setModalMvt(true); }}>⇄ Modifier le salaire (mouvement)</button>
              <button className="btn btn-p" disabled={pending || Object.keys(editForm).length === 0}
                onClick={async () => {
                  setPending(true);
                  const res = await modifierEmploye(emp.id, editForm);
                  setPending(false);
                  setModalEdit(false);
                  if (res.ok) { toast("Fiche mise à jour ✓ — modification tracée dans l’audit"); refresh(); }
                  else toast(`Erreur : ${res.error}`);
                }}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale documents — téléchargements réels */}
      {modalDoc && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalDoc(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div><h3>📄 Générer un document</h3><p>{nom} — PDF pré-rempli et archivé automatiquement.</p></div>
              <button className="x" onClick={() => setModalDoc(false)}>✕</button>
            </div>
            <div className="mb" style={{ display: "grid", gap: 8 }}>
              {[
                ["attestation_travail", "📃 Attestation de travail"],
                ["certificat_travail", "📜 Certificat de travail"],
                ["certificat_conge", "🌴 Certificat de congé (dernier approuvé)"],
                ["fiche_individuelle", "🗂 Fiche individuelle (PDF)"],
                ["fiche_individuelle&format=xlsx", "📊 Fiche individuelle (Excel)"],
                ["solde_tout_compte", "🧾 Solde de tout compte (motif & préavis : page Documents)"],
              ].map(([type, libelle]) => (
                <a key={libelle} className="btn btn-o" style={{ justifyContent: "flex-start" }}
                  href={`/api/documents/generer?type=${type.replace("&format=xlsx", "")}&employee=${emp.id}${type.includes("xlsx") ? "&format=xlsx" : ""}`}
                  onClick={() => { toast("Génération du document…"); setModalDoc(false); setTimeout(refresh, 1500); }}>
                  {libelle}
                </a>
              ))}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalDoc(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale mouvement — écriture réelle */}
      {modalMvt && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalMvt(false)}>
          <div className="mdl">
            <div className="mh">
              <div><h3>Nouveau mouvement de carrière</h3><p>{nom} — tracé dans l’historique d’audit.</p></div>
              <button className="x" onClick={() => setModalMvt(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld"><label>Type de mouvement</label><select defaultValue="augmentation"><option value="augmentation">Augmentation de salaire</option></select></div>
                <div className="fld"><label>Salaire actuel</label><input className="mono" value={comp ? formatGNF(comp.base_salary) + " GNF" : "—"} disabled style={{ background: "var(--menthe2)" }} /></div>
                <div className="fld"><label>Nouveau salaire de base</label><input className="mono" value={nouveauSalaire} onChange={(e) => setNouveauSalaire(e.target.value)} placeholder="3 200 000" /></div>
                <div className="fld w"><label>Motif</label><textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : révision annuelle…" /></div>
              </div>
              <div className="alert or"><span className="ic">ⓘ</span><div>Le salaire n’est <b>jamais modifié directement</b> : ce mouvement journalisé est appliqué par la base (ancienne/nouvelle valeur, motif, date d’effet).</div></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalMvt(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pending} onClick={enregistrerMouvement}>{pending ? "Enregistrement…" : "Enregistrer le mouvement"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
