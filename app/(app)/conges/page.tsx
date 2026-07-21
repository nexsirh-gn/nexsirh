"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery, initiales } from "@/lib/hooks";
import { deciderConge, demanderConge } from "@/app/actions";
import { DataTable, type Colonne } from "@/components/data-table";

type CTab = "attente" | "approuve" | "refuse";
type Demande = {
  id: string; leave_type_code: string; start_date: string; end_date: string;
  working_days: number; status: string; refusal_reason: string | null; comment: string | null;
  employees: { first_name: string; last_name: string; departments: { name: string } | null } | null;
};

export default function Conges() {
  const [tab, setTab] = useState<CTab>("attente");
  const [enTraitement, setEnTraitement] = useState<Demande | null>(null);
  const [motif, setMotif] = useState("");
  const [pending, setPending] = useState(false);
  const [modalDemande, setModalDemande] = useState(false);
  const [dEmploye, setDEmploye] = useState("");
  const [dType, setDType] = useState("CA");
  const [dDu, setDDu] = useState("");
  const [dAu, setDAu] = useState("");
  const [dComment, setDComment] = useState("");
  const toast = useToast();

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const [res, emps] = await Promise.all([
      sb.from("leave_requests")
        .select("id, leave_type_code, start_date, end_date, working_days, status, refusal_reason, comment, employees(first_name, last_name, departments(name))")
        .order("created_at", { ascending: false }),
      sb.from("employees").select("id, matricule, first_name, last_name").in("status", ["actif", "essai"]).order("matricule"),
    ]);
    if (res.error) throw res.error;
    return { demandes: res.data as unknown as Demande[], emps: emps.data ?? [] };
  });

  if (loading) return <div className="note">Chargement des congés…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const { demandes, emps } = data!;

  function joursOuvrables(a: string, b: string): number {
    let n = 0;
    for (let dt = new Date(a); dt <= new Date(b); dt.setDate(dt.getDate() + 1)) {
      if (dt.getDay() !== 0 && dt.getDay() !== 6) n++;
    }
    return n;
  }

  async function envoyerDemande() {
    if (!dEmploye || !dDu || !dAu) { toast("Salarié et dates obligatoires."); return; }
    setPending(true);
    const res = await demanderConge({
      employeeId: dEmploye, typeCode: dType, du: dDu, au: dAu,
      jours: joursOuvrables(dDu, dAu), commentaire: dComment,
    });
    setPending(false);
    setModalDemande(false);
    if (res.ok) { toast("Demande créée — circuit Manager → RH ✓"); setDEmploye(""); setDDu(""); setDAu(""); setDComment(""); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  const attente = demandes.filter((d) => d.status.startsWith("attente"));
  const approuvees = demandes.filter((d) => d.status === "approuve");
  const refusees = demandes.filter((d) => d.status === "refuse");
  const liste = tab === "attente" ? attente : tab === "approuve" ? approuvees : refusees;

  const nomDe = (d: Demande) => d.employees ? `${d.employees.last_name} ${d.employees.first_name}` : "—";
  const periode = (d: Demande) =>
    `${new Date(d.start_date).toLocaleDateString("fr-FR")} – ${new Date(d.end_date).toLocaleDateString("fr-FR")}`;

  async function decider(decision: "approuver" | "refuser") {
    if (!enTraitement) return;
    if (decision === "refuser" && !motif.trim()) { toast("Motif obligatoire en cas de refus."); return; }
    setPending(true);
    const res = await deciderConge(enTraitement.id, decision, motif);
    setPending(false);
    setEnTraitement(null);
    setMotif("");
    if (res.ok) { toast(decision === "approuver" ? "Congé approuvé ✓ — solde mis à jour" : "Demande refusée — salarié notifié"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  const colonnes: Colonne<Demande>[] = [
    {
      id: "salarie", entete: "Salarié", triPar: (d) => nomDe(d),
      cell: (d) => <div className="emp"><span className="av g">{initiales(nomDe(d))}</span><div><b>{nomDe(d)}</b><small>{d.employees?.departments?.name ?? ""}</small></div></div>,
    },
    { id: "type", entete: "Type", triPar: (d) => d.leave_type_code, cell: (d) => `${d.leave_type_code}${d.comment ? ` (${d.comment})` : ""}` },
    { id: "periode", entete: "Période", triPar: (d) => d.start_date, cell: (d) => periode(d) },
    { id: "jours", entete: "Jours ouvr.", num: true, triPar: (d) => d.working_days, classeCell: "gnf mono", cell: (d) => d.working_days },
    tab === "refuse"
      ? { id: "motif", entete: "Motif", cell: (d) => d.refusal_reason }
      : {
          id: "circuit", entete: "Circuit", cell: (d) => <>
            {d.status === "attente_manager" && <span className="bg bg-b">Manager…</span>}
            {d.status === "attente_rh" && <><span className="bg bg-v">Manager ✓</span> <span className="bg bg-o">RH…</span></>}
            {d.status === "approuve" && <span className="bg bg-v">Approuvée</span>}
          </>,
        },
    ...(tab === "attente"
      ? [{ id: "actions", entete: "", classeCell: "nowrap", cell: (d: Demande) => <button className="btn btn-p btn-sm" onClick={() => setEnTraitement(d)}>Traiter</button> } as Colonne<Demande>]
      : []),
  ];

  return (
    <div>
      <div className="tools">
        <button className={`chip ${tab === "attente" ? "on" : ""}`} onClick={() => setTab("attente")}>À traiter · {attente.length}</button>
        <button className={`chip ${tab === "approuve" ? "on" : ""}`} onClick={() => setTab("approuve")}>Approuvées · {approuvees.length}</button>
        <button className={`chip ${tab === "refuse" ? "on" : ""}`} onClick={() => setTab("refuse")}>Refusées · {refusees.length}</button>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => setModalDemande(true)}>+ Nouvelle demande</button>
      </div>
      <DataTable
        titre={tab === "attente" ? "Demandes en attente" : tab === "approuve" ? "Demandes approuvées" : "Demandes refusées"}
        colonnes={colonnes}
        lignes={liste}
        cle={(d) => d.id}
        recherchePar={(d) => `${nomDe(d)} ${d.leave_type_code} ${d.employees?.departments?.name ?? ""}`}
        placeholderRecherche="Salarié, type, département…"
        piedLibelle={(n) => `${n} demande${n > 1 ? "s" : ""}`}
        messageVide="Aucune demande."
      />

      {/* Modale nouvelle demande — écriture réelle */}
      {modalDemande && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalDemande(false)}>
          <div className="mdl">
            <div className="mh">
              <div><h3>Nouvelle demande de congé</h3><p>Les jours ouvrables sont calculés automatiquement (week-ends exclus).</p></div>
              <button className="x" onClick={() => setModalDemande(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld w"><label>Salarié</label>
                  <select value={dEmploye} onChange={(e) => setDEmploye(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {emps.map((e) => <option key={e.id} value={e.id}>{e.last_name} {e.first_name} — {e.matricule}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Type d’absence</label>
                  <select value={dType} onChange={(e) => setDType(e.target.value)}>
                    <option value="CA">Congé annuel</option><option value="CM">Congé maladie</option>
                    <option value="CMAT">Congé maternité</option><option value="PERM">Permission exceptionnelle</option>
                    <option value="ANJ">Absence non justifiée</option>
                  </select>
                </div>
                <div className="fld"><label>Du</label><input type="date" value={dDu} onChange={(e) => setDDu(e.target.value)} /></div>
                <div className="fld"><label>Au (inclus)</label><input type="date" value={dAu} onChange={(e) => setDAu(e.target.value)} /></div>
                <div className="fld w"><label>Commentaire</label><textarea rows={2} value={dComment} onChange={(e) => setDComment(e.target.value)} placeholder="Motif ou précision…" /></div>
              </div>
              {dDu && dAu && (
                <div className="alert vt"><span className="ic">🧮</span><div><b>{joursOuvrables(dDu, dAu)} jours ouvrables</b> décomptés. Circuit : Manager → RH.</div></div>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalDemande(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pending || !dEmploye || !dDu || !dAu} onClick={envoyerDemande}>
                {pending ? "Envoi…" : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de traitement — écriture réelle */}
      {enTraitement && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setEnTraitement(null)}>
          <div className="mdl">
            <div className="mh">
              <div>
                <h3>Traiter la demande de congé</h3>
                <p>{nomDe(enTraitement)} · {enTraitement.leave_type_code} · {periode(enTraitement)} ({enTraitement.working_days} j ouvrables)</p>
              </div>
              <button className="x" onClick={() => setEnTraitement(null)}>✕</button>
            </div>
            <div className="mb">
              <div className="stat-line">
                <span>Étape actuelle</span>
                <b>{enTraitement.status === "attente_manager" ? <span className="bg bg-b">Validation manager</span> : <span className="bg bg-o">Validation RH</span>}</b>
              </div>
              <div className="fld" style={{ marginTop: 16 }}>
                <label>Motif (obligatoire en cas de refus)</label>
                <textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : effectif insuffisant sur la période…" />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setEnTraitement(null)}>Fermer</button>
              <button className="btn btn-d" disabled={pending} onClick={() => decider("refuser")}>Refuser</button>
              <button className="btn btn-p" disabled={pending} onClick={() => decider("approuver")}>
                ✓ Approuver {enTraitement.status === "attente_manager" ? "(manager)" : "(validation RH)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
