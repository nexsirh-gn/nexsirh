"use client";

import { useModal, useToast } from "@/components/providers";

export default function Documents() {
  const { om } = useModal();
  const toast = useToast();
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
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => om("mGenererDoc")}>
          <div className="l">📃 Attestation de travail</div>
          <div className="d" style={{ marginTop: 8 }}>Générée en un clic, signée numériquement.</div>
          <div style={{ marginTop: 10 }}><span className="link">Générer →</span></div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => om("mGenererDoc")}>
          <div className="l">📜 Certificat de travail</div>
          <div className="d" style={{ marginTop: 8 }}>Pour les salariés sortis (art. Code du travail).</div>
          <div style={{ marginTop: 10 }}><span className="link">Générer →</span></div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => om("mGenererDoc")}>
          <div className="l">🌴 Certificat de congé</div>
          <div className="d" style={{ marginTop: 8 }}>À partir d’une demande approuvée.</div>
          <div style={{ marginTop: 10 }}><span className="link">Générer →</span></div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => om("mGenererDoc")}>
          <div className="l">🧾 Solde de tout compte</div>
          <div className="d" style={{ marginTop: 8 }}>Congés non pris, indemnités, préavis — calcul auto.</div>
          <div style={{ marginTop: 10 }}><span className="link">Générer →</span></div>
        </div>
      </div>

      <div className="panel">
        <div className="hd"><h3>Documents générés récemment</h3><span className="sp" /><div className="srch" style={{ width: 230 }}><input placeholder="Rechercher…" /></div></div>
        <table>
          <tbody>
            <tr><th>Document</th><th>Salarié</th><th>Généré par</th><th>Date</th><th></th></tr>
            <tr><td>📄 Bulletins de paie (lot de 24)</td><td>Tous — Juin 2026</td><td>M. Tolno</td><td>30/06/2026</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Archive ZIP téléchargée")}>⇩ ZIP</button></td></tr>
            <tr><td>📃 Attestation de travail</td><td>FAYE Aboubacar</td><td>M. Tolno</td><td>03/04/2026</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
            <tr><td>🧾 Solde de tout compte</td><td>KEITA Sékou (sorti)</td><td>M. Tolno</td><td>28/02/2026</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
            <tr><td>📜 Certificat de travail</td><td>KEITA Sékou (sorti)</td><td>M. Tolno</td><td>28/02/2026</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
