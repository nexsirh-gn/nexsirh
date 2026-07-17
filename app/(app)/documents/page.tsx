"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { genererDocument } from "@/app/actions";

const TYPES_DOC: [string, string, string][] = [
  ["attestation_travail", "📃 Attestation de travail", "Générée en un clic, signée numériquement."],
  ["certificat_travail", "📜 Certificat de travail", "Pour les salariés sortis (art. Code du travail)."],
  ["certificat_conge", "🌴 Certificat de congé", "À partir d’une demande approuvée."],
  ["solde_tout_compte", "🧾 Solde de tout compte", "Congés non pris, indemnités, préavis — calcul auto."],
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
  const { om } = useModal();
  const toast = useToast();
  const [modal, setModal] = useState<string | null>(null);
  const [employeId, setEmployeId] = useState("");
  const [mention, setMention] = useState("");
  const [pending, setPending] = useState(false);

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const [docs, emps] = await Promise.all([
      sb.from("documents").select("id, doc_type, title, period, created_at, employees(first_name, last_name)")
        .order("created_at", { ascending: false }).limit(30),
      sb.from("employees").select("id, matricule, first_name, last_name").in("status", ["actif", "essai"]).order("matricule"),
    ]);
    if (docs.error) throw docs.error;
    return { docs: docs.data ?? [], emps: emps.data ?? [] };
  });

  if (loading) return <div className="note">Chargement des documents…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  async function generer() {
    if (!modal) return;
    setPending(true);
    const emp = d.emps.find((e) => e.id === employeId);
    const res = await genererDocument({
      docType: modal,
      titre: `${LIBELLES[modal]}${emp ? ` — ${emp.last_name} ${emp.first_name}` : ""}${mention ? ` (${mention})` : ""}`,
      employeeId: employeId || undefined,
      categorie: "rh",
    });
    setPending(false);
    setModal(null);
    setEmployeId("");
    setMention("");
    if (res.ok) { toast("Document généré et archivé 📄 (PDF réel : étape O)"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18, borderLeft: "4px solid var(--or)" }}>
        <div className="hd"><h3>📑 Documents administratifs — déclarations légales</h3><span className="sp" /><button className="btn btn-or" onClick={() => om("mDocsAdmin")}>Ouvrir le générateur</button></div>
        <div className="bd" style={{ paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="bg bg-v">Registre du personnel (Inspection du Travail / CNSS)</span>
          <span className="bg bg-v">Déclaration CNSS mensuelle</span>
          <span className="bg bg-v">État RTS mensuel — format eTax (DNI)</span>
          <span className="bg bg-v">État des salaires</span>
          <span className="bg bg-v">Suivi des congés</span>
          <span className="bg bg-v">Fiche individuelle</span>
        </div>
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
                  <td><button className="btn btn-g btn-sm" onClick={() => toast("PDF réel : étape O (génération serveur + Storage)")}>⇩ PDF</button></td>
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
              <div><h3>Générer : {LIBELLES[modal]}</h3><p>Les métadonnées sont archivées en base ; le PDF est pré-rempli avec les données du salarié.</p></div>
              <button className="x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld w"><label>Salarié</label>
                  <select value={employeId} onChange={(e) => setEmployeId(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {d.emps.map((e) => (
                      <option key={e.id} value={e.id}>{e.last_name} {e.first_name} — {e.matricule}</option>
                    ))}
                  </select>
                </div>
                <div className="fld w"><label>Mention particulière (optionnel)</label>
                  <input value={mention} onChange={(e) => setMention(e.target.value)} placeholder="Ex. : document destiné à la BIG pour dossier de crédit" />
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-p" disabled={pending || !employeId} onClick={generer}>{pending ? "Génération…" : "Générer le document"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
