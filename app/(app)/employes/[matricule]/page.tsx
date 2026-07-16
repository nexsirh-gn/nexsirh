"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

type Tab = "ft1" | "ft2" | "ft3" | "ft4" | "ft5" | "ft6";
const TABS: [Tab, string][] = [
  ["ft1", "Identité"],
  ["ft2", "Contrat"],
  ["ft3", "Salaire & primes"],
  ["ft4", "Congés"],
  ["ft5", "Documents"],
  ["ft6", "Historique"],
];

export default function FicheEmploye() {
  const [tab, setTab] = useState<Tab>("ft1");
  const { om } = useModal();
  const toast = useToast();

  return (
    <div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <span className="av" style={{ width: 56, height: 56, fontSize: 19 }}>AF</span>
        <div style={{ flex: 1 }}>
          <h2 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>
            FAYE Aboubacar <span className="bg bg-v" style={{ verticalAlign: 3, marginLeft: 6 }}>Actif</span>
          </h2>
          <span className="crumb">Comptable · DAF · Matricule <b className="mono">EMP-002</b> · CDI depuis le 01/05/2016 — 10 ans et 2 mois d’ancienneté</span>
        </div>
        <button className="btn btn-o" onClick={() => om("mMouvement")}>⇄ Nouveau mouvement</button>
        <button className="btn btn-o" onClick={() => om("mGenererDoc")}>📄 Générer un document</button>
        <button className="btn btn-p" onClick={() => om("mModifEmploye")}>✎ Modifier</button>
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
              <div><label>Civilité</label><div>M.</div></div><div><label>Nationalité</label><div>Guinéenne</div></div>
              <div><label>Nom</label><div><b>FAYE</b></div></div><div><label>Prénom</label><div><b>Aboubacar</b></div></div>
              <div><label>Naissance</label><div>14/03/1988 · Conakry</div></div><div><label>Situation</label><div>Marié · 3 enfants</div></div>
              <div><label>N° Sécurité sociale</label><div className="mono">11905 1224</div></div>
              <div><label>Pièce d’identité</label><div>CNI n° <span className="mono">C0482210</span> — exp. 09/2027</div></div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Coordonnées &amp; urgence</h3></div>
            <div className="bd fgrid">
              <div className="w"><label>Adresse</label><div>Hafia, Commune de Ratoma, Conakry</div></div>
              <div><label>Téléphone</label><div className="mono">628 44 12 09</div></div>
              <div><label>Email</label><div>faye.a@garaya.gn</div></div>
              <div className="w"><label>Contact d’urgence</label><div>FAYE Mariama (épouse) — <span className="mono">655 20 31 77</span></div></div>
            </div>
          </div>
        </div>
      )}

      {tab === "ft2" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Contrat en cours</h3><span className="sp" /><span className="bg bg-v">CDI</span></div>
            <div className="bd fgrid">
              <div><label>Date d’embauche</label><div>01/05/2016</div></div>
              <div><label>Période d’essai</label><div>Validée le 01/08/2016</div></div>
              <div><label>Catégorie</label><div>Employé</div></div>
              <div><label>Qualification</label><div>BAC+3</div></div>
              <div><label>Supérieur (N+1)</label><div>PLEGNEMOU Gassim — R.A.F</div></div>
              <div><label>Horaire mensuel</label><div className="mono">173,33 h</div></div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Banque &amp; paiement</h3></div>
            <div className="bd fgrid">
              <div><label>Mode</label><div>Virement bancaire</div></div>
              <div><label>Banque</label><div>BIG — Banque Int. de Guinée</div></div>
              <div className="w"><label>N° de compte</label><div className="mono">461452510189</div></div>
            </div>
          </div>
        </div>
      )}

      {tab === "ft3" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Rémunération mensuelle</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => om("mMouvement")}>Modifier via mouvement</button></div>
            <div className="bd">
              <div className="stat-line"><span>Salaire de base</span><b className="gnf">3 000 000</b></div>
              <div className="stat-line"><span>Prime d’ancienneté <span className="bg bg-g" style={{ marginLeft: 6 }}>auto</span></span><b className="gnf">120 000</b></div>
              <div className="stat-line"><span>Prime de repas</span><b className="gnf">150 000</b></div>
              <div className="stat-line"><span>Indemnité de logement <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">150 000</b></div>
              <div className="stat-line"><span>Indemnité de transport <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">225 000</b></div>
              <div className="stat-line"><span>Indemnité de cherté de vie <span className="bg bg-b" style={{ marginLeft: 6 }}>exonérée RTS</span></span><b className="gnf">100 000</b></div>
              <div className="stat-line" style={{ borderTop: "2px solid var(--encre)", marginTop: 6, paddingTop: 12 }}>
                <span><b>Brut mensuel théorique</b></span><b className="gnf" style={{ fontSize: 16 }}>3 745 000 GNF</b>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Retenues récurrentes</h3></div>
            <div className="bd">
              <div className="stat-line"><span>Prêt personnel <small style={{ color: "var(--gris)" }}>— 8/24 mensualités</small></span><b className="gnf" style={{ color: "var(--rouge)" }}>− 2 016 982</b></div>
              <div style={{ margin: "10px 0 16px" }}>
                <div className="prog"><i style={{ width: "33%" }} /></div>
                <small className="note">Reste à rembourser : <b className="mono">32 271 710 GNF</b></small>
              </div>
              <button className="btn btn-o btn-sm" onClick={() => toast("Formulaire d’échéancier de prêt ouvert")}>+ Ajouter une avance / un prêt</button>
            </div>
          </div>
        </div>
      )}

      {tab === "ft4" && (
        <div>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kpi"><div className="l">Droits acquis 2026</div><div className="v">17,5 j</div><div className="d">2,5 j/mois × 7 mois + <b>2 j</b> ancienneté (10 ans)</div></div>
            <div className="kpi"><div className="l">Jours pris</div><div className="v">6 j</div><div className="d">dernier : 10 – 17 mars</div></div>
            <div className="kpi gold"><div className="l">Solde disponible</div><div className="v">11,5 j</div><div className="d">+ report 2025 : <b>0 j</b></div></div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Historique des absences</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mDemandeConge")}>+ Nouvelle demande</button></div>
            <table>
              <tbody>
                <tr><th>Type</th><th>Période</th><th className="num">Jours ouvr.</th><th>Statut</th><th>Validée par</th></tr>
                <tr><td>Congé annuel</td><td>10 – 17 mars 2026</td><td className="gnf mono">6</td><td><span className="bg bg-v">Approuvée</span></td><td>G. Plegnemou → M. Tolno</td></tr>
                <tr><td>Permission (décès)</td><td>22 janvier 2026</td><td className="gnf mono">1</td><td><span className="bg bg-v">Approuvée</span></td><td>M. Tolno</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ft5" && (
        <div className="panel">
          <div className="hd"><h3>Documents du salarié</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mGenererDoc")}>+ Générer</button></div>
          <table>
            <tbody>
              <tr><th>Document</th><th>Période / objet</th><th>Généré le</th><th></th></tr>
              <tr><td>📄 Bulletin de paie</td><td>Juin 2026</td><td>30/06/2026</td><td><button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Aperçu</button> <button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
              <tr><td>📄 Bulletin de paie</td><td>Mai 2026</td><td>31/05/2026</td><td><button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Aperçu</button> <button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
              <tr><td>📃 Attestation de travail</td><td>Demande banque</td><td>03/04/2026</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
              <tr><td>📑 Contrat de travail (CDI)</td><td>Embauche</td><td>01/05/2016</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "ft6" && (
        <div className="panel">
          <div className="hd"><h3>Historique de carrière (audit)</h3></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl gold"><small>01/06/2026 · par M. Tolno (RH)</small><b>Augmentation de salaire</b> — Salaire de base : <span className="mono">2 800 000 → 3 000 000 GNF</span>. Motif : révision annuelle.</div>
              <div className="tl"><small>15/02/2024 · par M. Tolno (RH)</small><b>Prêt personnel accordé</b> — <span className="mono">48 407 566 GNF</span> sur 24 mois.</div>
              <div className="tl"><small>01/03/2019 · par Direction</small><b>Promotion</b> — Aide-comptable → <b>Comptable</b>.</div>
              <div className="tl"><small>01/05/2016 · système</small><b>Embauche</b> — CDI, période d’essai 3 mois.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
