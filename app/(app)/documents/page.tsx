"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

const TYPES_DOC: [string, string, string][] = [
  ["attestation_travail", "📃 Attestation de travail", "Générée en un clic, pré-remplie avec les données du salarié."],
  ["certificat_travail", "📜 Certificat de travail", "Pour les salariés sortis (art. Code du travail)."],
  ["certificat_conge", "🌴 Certificat de congé", "À partir de la dernière demande approuvée."],
  ["solde_tout_compte", "🧾 Solde de tout compte", "Congés non pris, dernière paie — indemnités à valider RH."],
];

const LIBELLES: Record<string, string> = {
  bulletin: "Bulletin de paie", journal_paie: "Journal de paie", attestation_travail: "Attestation de travail",
  certificat_travail: "Certificat de travail", certificat_conge: "Certificat de congé",
  solde_tout_compte: "Solde de tout compte", contrat: "Contrat de travail",
  registre_personnel: "Registre du personnel", declaration_cnss: "Déclaration CNSS",
  etat_rts: "État RTS", etat_salaires: "État des salaires", suivi_conges: "Suivi des congés",
  fiche_individuelle: "Fiche individuelle", facture: "Facture", autre: "Document",
};

export default function Documents() {
  const toast = useToast();
  const [modal, setModal] = useState<string | null>(null);
  const [employeId, setEmployeId] = useState("");
  const [motif, setMotif] = useState("licenciement");
  const [preavis, setPreavis] = useState("effectue");

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const [docs, emps, run] = await Promise.all([
      sb.from("documents").select("id, doc_type, title, period, created_at, employee_id, employees(first_name, last_name)")
        .order("created_at", { ascending: false }).limit(30),
      sb.from("employees").select("id, matricule, first_name, last_name").order("matricule"),
      sb.from("payroll_runs").select("id, period_year, period_month")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (docs.error) throw docs.error;
    return { docs: docs.data ?? [], emps: emps.data ?? [], run: run.data };
  });

  if (loading) return <div className="note">Chargement des documents…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  function telecharger(type: string, params: Record<string, string> = {}) {
    const qs = new URLSearchParams({ type, ...params }).toString();
    window.location.assign(`/api/documents/generer?${qs}`);
    toast("Génération du PDF en cours…");
    setModal(null);
    setEmployeId("");
    setTimeout(refresh, 1500); // recharge la liste après archivage des métadonnées
  }

  const docsAdmin: [string, string][] = [
    ["registre_personnel", "Registre du personnel (Inspection du Travail / CNSS)"],
    ["declaration_cnss", "Déclaration CNSS mensuelle"],
    ["etat_rts", "État RTS mensuel — format eTax (DNI)"],
    ["etat_salaires", "État des salaires"],
    ["suivi_conges", "Suivi des congés"],
  ];

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18, borderLeft: "4px solid var(--or)" }}>
        <div className="hd"><h3>📑 Documents administratifs — déclarations légales</h3>
          {d.run && <span className="note" style={{ marginLeft: 8 }}>période : {String(d.run.period_month).padStart(2, "0")}/{d.run.period_year}</span>}
        </div>
        <table>
          <tbody>
            {docsAdmin.map(([type, libelle]) => {
              const besoinRun = ["declaration_cnss", "etat_rts", "etat_salaires"].includes(type);
              return (
                <tr key={type}>
                  <td>📄 {libelle}</td>
                  <td style={{ textAlign: "right" }}>
                    {besoinRun && !d.run
                      ? <span className="note">aucune paie générée</span>
                      : <button className="btn btn-o btn-sm" onClick={() => telecharger(type, besoinRun ? { run: d.run!.id } : {})}>⇩ Générer le PDF</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {TYPES_DOC.map(([type, titre, desc]) => (
          <div key={type} className="kpi" style={{ cursor: "pointer" }} onClick={() => setModal(type)}>
            <div className="l">{titre}</div>
            <div className="d" style={{ marginTop: 8 }}>{desc}</div>
            <div style={{ marginTop: 10 }}><span className="link">Générer →</span></div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="hd"><h3>Documents générés récemment</h3></div>
        <table>
          <tbody>
            <tr><th>Document</th><th>Salarié</th><th>Période</th><th>Date</th><th></th></tr>
            {d.docs.map((doc) => {
              const emp = doc.employees as unknown as { first_name: string; last_name: string } | null;
              return (
                <tr key={doc.id}>
                  <td>📄 {doc.title}</td>
                  <td>{emp ? `${emp.last_name} ${emp.first_name}` : "—"}</td>
                  <td>{doc.period ?? "—"}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                  <td>{LIBELLES[doc.doc_type] && doc.doc_type !== "bulletin" && doc.doc_type !== "contrat" && doc.doc_type !== "facture" && doc.doc_type !== "autre" && (
                    <button className="btn btn-g btn-sm" onClick={() => {
                      const besoinRun = ["journal_paie", "declaration_cnss", "etat_rts", "etat_salaires"].includes(doc.doc_type);
                      const empDoc = (doc as unknown as { employee_id?: string }).employee_id;
                      if (besoinRun && d.run) telecharger(doc.doc_type, { run: d.run.id });
                      else if (empDoc) telecharger(doc.doc_type, { employee: empDoc });
                      else if (!besoinRun) telecharger(doc.doc_type);
                    }}>⇩ PDF</button>
                  )}</td>
                </tr>
              );
            })}
            {d.docs.length === 0 && <tr><td colSpan={5} className="note">Aucun document généré.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="mdl">
            <div className="mh">
              <div><h3>Générer : {LIBELLES[modal]}</h3><p>Le PDF est pré-rempli avec les données du salarié et archivé automatiquement.</p></div>
              <button className="x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="mb">
              <div className="fld"><label>Salarié</label>
                <select value={employeId} onChange={(e) => setEmployeId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {d.emps.map((e) => (
                    <option key={e.id} value={e.id}>{e.last_name} {e.first_name} — {e.matricule}</option>
                  ))}
                </select>
              </div>
              {modal === "solde_tout_compte" && (
                <>
                  <div className="fgrid">
                    <div className="fld"><label>Motif du départ</label>
                      <select value={motif} onChange={(e) => setMotif(e.target.value)}>
                        <option value="licenciement">Licenciement</option>
                        <option value="demission">Démission</option>
                        <option value="fin_cdd">Fin de CDD</option>
                        <option value="retraite">Départ à la retraite</option>
                      </select>
                    </div>
                    <div className="fld"><label>Préavis</label>
                      <select value={preavis} onChange={(e) => setPreavis(e.target.value)}>
                        <option value="effectue">Effectué</option>
                        <option value="non_effectue">Non effectué (à indemniser)</option>
                      </select>
                    </div>
                  </div>
                  <div className="alert vt"><span className="ic">🧮</span><div>Calcul automatique : prorata du mois, congés non pris (brut/26), indemnité de licenciement (25/30/35 % par tranche d’ancienneté), préavis — feuille de calcul détaillée jointe.</div></div>
                </>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-p" disabled={!employeId}
                onClick={() => telecharger(modal, {
                  employee: employeId,
                  ...(modal === "solde_tout_compte" ? { motif, preavis } : {}),
                })}>⇩ Générer le PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
