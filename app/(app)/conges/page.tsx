"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

type CTab = "ct1" | "ct2" | "ct3" | "ct4";

export default function Conges() {
  const [tab, setTab] = useState<CTab>("ct1");
  const { om } = useModal();
  const toast = useToast();

  const chips: [CTab, string][] = [
    ["ct1", "À traiter · 3"],
    ["ct2", "Approuvées · 12"],
    ["ct3", "Refusées · 2"],
    ["ct4", "Planning"],
  ];

  return (
    <div>
      <div className="tools">
        {chips.map(([id, label]) => (
          <button key={id} className={`chip ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
        <span className="sp" />
        <button className="btn btn-p" onClick={() => om("mDemandeConge")}>+ Nouvelle demande</button>
      </div>

      {tab === "ct1" && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="hd"><h3>Demandes en attente</h3></div>
          <table>
            <tbody>
              <tr><th>Salarié</th><th>Type</th><th>Période</th><th className="num">Jours ouvr.</th><th className="num">Solde après</th><th>Circuit</th><th></th></tr>
              <tr>
                <td><div className="emp"><span className="av g">BC</span><div><b>CAMARA Bountouraby</b><small>D.R.H</small></div></div></td>
                <td>Congé annuel</td><td>04 – 15 août</td><td className="gnf mono">9</td><td className="gnf mono">3,5 j</td>
                <td><span className="bg bg-v">Manager ✓</span> <span className="bg bg-o">RH…</span></td>
                <td><button className="btn btn-p btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
              <tr>
                <td><div className="emp"><span className="av g">OC</span><div><b>CONTE Ousmane</b><small>Conformité</small></div></div></td>
                <td>Permission (mariage)</td><td>21 juillet</td><td className="gnf mono">1</td><td className="gnf mono">—</td>
                <td><span className="bg bg-b">Manager…</span></td>
                <td><button className="btn btn-p btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
              <tr>
                <td><div className="emp"><span className="av g">AT</span><div><b>TRAORE Aminata</b><small>DAF</small></div></div></td>
                <td>Congé maladie <span className="bg bg-g">certificat joint</span></td><td>10 – 11 juillet</td><td className="gnf mono">2</td><td className="gnf mono">n/a</td>
                <td><span className="bg bg-v">Manager ✓</span> <span className="bg bg-o">RH…</span></td>
                <td><button className="btn btn-p btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "ct2" && (
        <div className="panel">
          <div className="hd"><h3>Demandes approuvées — 2026</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Export Excel des congés approuvés généré")}>⇩ Exporter</button></div>
          <table>
            <tbody>
              <tr><th>Salarié</th><th>Type</th><th>Période</th><th className="num">Jours ouvr.</th><th>Validée par (Manager → RH)</th><th>Le</th><th></th></tr>
              <tr><td><div className="emp"><span className="av g">AF</span><div><b>FAYE Aboubacar</b><small>DAF</small></div></div></td><td>Congé annuel</td><td>10 – 17 mars</td><td className="gnf mono">6</td><td>G. Plegnemou → M. Tolno</td><td>02/03</td><td><button className="btn btn-g btn-sm" onClick={() => om("mGenererDoc")}>Certificat</button></td></tr>
              <tr><td><div className="emp"><span className="av g">MB</span><div><b>BARRY Moussa</b><small>D.R.H</small></div></div></td><td>Permission (mariage)</td><td>21 juillet</td><td className="gnf mono">1</td><td>M. Tolno</td><td>08/07</td><td><button className="btn btn-g btn-sm" onClick={() => om("mGenererDoc")}>Certificat</button></td></tr>
              <tr><td><div className="emp"><span className="av g">BC</span><div><b>CAMARA Bountouraby</b><small>D.R.H</small></div></div></td><td>Congé annuel</td><td>23 – 27 déc. 2025</td><td className="gnf mono">4</td><td>M. Barry → M. Tolno</td><td>10/12</td><td><button className="btn btn-g btn-sm" onClick={() => om("mGenererDoc")}>Certificat</button></td></tr>
              <tr><td><div className="emp"><span className="av g">GP</span><div><b>PLEGNEMOU Gassim</b><small>DAF</small></div></div></td><td>Congé annuel</td><td>05 – 16 janv.</td><td className="gnf mono">10</td><td>I. Sow → M. Tolno</td><td>18/12</td><td><button className="btn btn-g btn-sm" onClick={() => om("mGenererDoc")}>Certificat</button></td></tr>
            </tbody>
          </table>
          <div className="pgn"><span>12 demandes approuvées en 2026</span><div className="pgs"><button className="on">1</button><button>2</button></div></div>
        </div>
      )}

      {tab === "ct3" && (
        <div className="panel">
          <div className="hd"><h3>Demandes refusées — 2026</h3></div>
          <table>
            <tbody>
              <tr><th>Salarié</th><th>Type</th><th>Période</th><th className="num">Jours</th><th>Refusée par</th><th>Motif</th></tr>
              <tr><td><div className="emp"><span className="av g">AS</span><div><b>SYLLA Aboubacar</b><small>Conformité</small></div></div></td><td>Congé annuel</td><td>28/07 – 08/08</td><td className="gnf mono">9</td><td>M. Tolno (RH)</td><td>Fin de CDD le 31/07 — solde payé au solde de tout compte</td></tr>
              <tr><td><div className="emp"><span className="av g">OC</span><div><b>CONTE Ousmane</b><small>Conformité</small></div></div></td><td>Congé annuel</td><td>02 – 06 juin</td><td className="gnf mono">5</td><td>G. Plegnemou (Manager)</td><td>Effectif insuffisant — inventaire semestriel</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "ct4" && (
        <div className="panel">
          <div className="hd">
            <h3>Planning d’équipe — Juillet 2026 · D.R.H</h3><span className="sp" />
            <span className="leg" style={{ display: "flex", gap: 14 }}>
              <span><i style={{ background: "var(--vert)" }} />Congé annuel</span>
              <span><i style={{ background: "var(--rouge)" }} />Maladie</span>
              <span><i style={{ background: "var(--or)" }} />Permission</span>
            </span>
          </div>
          <div className="bd">
            <div className="wk">
              <div />
              {["L13", "M14", "M15", "J16", "V17", "S", "D", "L20", "M21", "M22", "J23", "V24", "S", "D"].map((d, i) => (
                <div key={i} className="hd7">{d}</div>
              ))}
              <div className="nm">TOLNO Michel</div>
              {["", "", "", "", "", "we", "we", "", "", "", "", "", "we", "we"].map((c, i) => <div key={i} className={`dy ${c}`} />)}
              <div className="nm">CAMARA Bountouraby</div>
              {["", "", "ca", "ca", "ca", "we", "we", "", "", "", "", "", "we", "we"].map((c, i) => <div key={i} className={`dy ${c}`} />)}
              <div className="nm">BARRY Moussa</div>
              {["", "", "", "", "", "we", "we", "", "pm", "", "", "", "we", "we"].map((c, i) => <div key={i} className={`dy ${c}`} />)}
              <div className="nm">DIALLO Fatoumata</div>
              {["", "cm", "cm", "", "", "we", "we", "", "", "", "", "", "we", "we"].map((c, i) => <div key={i} className={`dy ${c}`} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
