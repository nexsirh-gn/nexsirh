"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

type ETab = "et1" | "et2" | "et3" | "et4";
const TABS: [ETab, string][] = [
  ["et1", "Activité"],
  ["et2", "Abonnement & factures"],
  ["et3", "Utilisateurs"],
  ["et4", "Journal"],
];

export default function FicheEntreprise() {
  const [tab, setTab] = useState<ETab>("et1");
  const { om } = useModal();
  const toast = useToast();

  return (
    <div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <span className="av" style={{ width: 56, height: 56, fontSize: 19 }}>GH</span>
        <div style={{ flex: 1 }}>
          <h2 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>
            GARAYA HOLDING <span className="bg bg-v" style={{ verticalAlign: 3, marginLeft: 6 }}>Active</span>{" "}
            <span className="bg bg-v" style={{ verticalAlign: 3 }}>Business</span>
          </h2>
          <span className="crumb">NIF <b className="mono">375106275</b> · Kipé, Ratoma · Cliente depuis le 24/06/2026 · Admin : m.tolno@garaya.gn</span>
        </div>
        <button className="btn btn-o" onClick={() => om("mImpersonate")}>🎧 Accès support</button>
        <button className="btn btn-o" onClick={() => toast("Export RGPD complet des données de l’entreprise lancé (ZIP chiffré)")}>⇩ Exporter les données</button>
        <button className="btn btn-d" onClick={() => om("mSuspendre")}>⏸ Suspendre</button>
      </div>

      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "et1" && (
        <div>
          <div className="kpis">
            <div className="kpi"><div className="l">Salariés gérés</div><div className="v">24 <span style={{ fontSize: 13, color: "var(--gris)" }}>/ 50</span></div><div className="d"><div className="prog" style={{ marginTop: 6 }}><i style={{ width: "48%" }} /></div></div></div>
            <div className="kpi"><div className="l">Paies clôturées</div><div className="v">12</div><div className="d">dernière : juin 2026, le 30/06</div></div>
            <div className="kpi"><div className="l">Documents générés</div><div className="v">318</div><div className="d">dont 288 bulletins PDF</div></div>
            <div className="kpi"><div className="l">Dernière connexion</div><div className="v" style={{ fontSize: 17, paddingTop: 6 }}>Aujourd’hui 09:12</div><div className="d">M. Tolno (RH)</div></div>
          </div>
          <div className="grid2">
            <div className="panel">
              <div className="hd"><h3>Utilisation des modules — 30 jours</h3></div>
              <div className="bd">
                <div className="hbar"><span className="nm">Paie</span><div className="tr"><i style={{ width: "92%" }} /></div><b className="mono">412 actions</b></div>
                <div className="hbar"><span className="nm">Employés</span><div className="tr"><i style={{ width: "64%" }} /></div><b className="mono">286</b></div>
                <div className="hbar"><span className="nm">Congés</span><div className="tr"><i style={{ width: "48%" }} /></div><b className="mono">214</b></div>
                <div className="hbar"><span className="nm">Documents</span><div className="tr"><i style={{ width: "37%" }} /></div><b className="mono">166</b></div>
                <div className="hbar"><span className="nm">Portail employé</span><div className="tr"><i className="o" style={{ width: "71%" }} /></div><b className="mono">318 visites</b></div>
              </div>
            </div>
            <div className="panel">
              <div className="hd"><h3>Notes internes</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Note interne enregistrée")}>+ Note</button></div>
              <div className="bd">
                <div className="alert vt"><span className="ic">📌</span><div><b>09/07 — Support :</b> ticket #248 (écart RTS) : venait d’une prime saisie hors barème. Résolu, client satisfait.</div></div>
                <div className="alert or"><span className="ic">💡</span><div><b>02/07 — Commercial :</b> intéressés par le futur paiement Orange Money. À recontacter au lancement.</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "et2" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Abonnement</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => om("mPlanEdit")}>Changer de plan</button></div>
            <div className="bd">
              <div className="stat-line"><span>Plan</span><b>Business — 950 000 GNF / mois</b></div>
              <div className="stat-line"><span>Statut</span><b><span className="bg bg-v">Actif</span></b></div>
              <div className="stat-line"><span>Prochain prélèvement</span><b>24/08/2026 · carte •••• 4242</b></div>
              <div className="stat-line"><span>Client depuis</span><b>24/06/2026 (essai converti j.18)</b></div>
              <div className="stat-line"><span>Revenu cumulé</span><b className="gnf">1 900 000 GNF</b></div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn btn-o btn-sm" onClick={() => toast("Remise appliquée : -10 % pendant 3 mois")}>% Appliquer une remise</button>
                <button className="btn btn-o btn-sm" onClick={() => toast("Abonnement mis en pause jusqu’au 24/09")}>⏸ Pause facturation</button>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="hd"><h3>Factures</h3></div>
            <table>
              <tbody>
                <tr><th>N°</th><th>Période</th><th className="num">Montant</th><th>Statut</th><th></th></tr>
                <tr><td className="mono">F-2026-0812</td><td>24/07 – 24/08</td><td className="gnf">950 000</td><td><span className="bg bg-v">Payée</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Facture PDF téléchargée")}>⇩</button></td></tr>
                <tr><td className="mono">F-2026-0704</td><td>24/06 – 24/07</td><td className="gnf">950 000</td><td><span className="bg bg-v">Payée</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Facture PDF téléchargée")}>⇩</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "et3" && (
        <div className="panel">
          <div className="hd"><h3>Utilisateurs de l’entreprise</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Email de réinitialisation envoyé à l’admin")}>🔑 Réinitialiser l’admin</button></div>
          <table>
            <tbody>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th>Statut</th><th></th></tr>
              <tr><td><b>Michel TOLNO</b> <small style={{ color: "var(--gris)" }}>m.tolno@garaya.gn</small></td><td><span className="bg bg-v">RH (admin)</span></td><td>Aujourd’hui 09:12</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Session utilisateur révoquée")}>Révoquer session</button></td></tr>
              <tr><td><b>Ibrahima SOW</b> <small style={{ color: "var(--gris)" }}>dg@garaya.gn</small></td><td><span className="bg bg-b">Direction</span></td><td>Hier 18:40</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Session utilisateur révoquée")}>Révoquer session</button></td></tr>
              <tr><td><b>18 employés (portail)</b></td><td><span className="bg bg-g">Employé</span></td><td>—</td><td><span className="bg bg-v">Actifs</span></td><td></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "et4" && (
        <div className="panel">
          <div className="hd"><h3>Journal de l’entreprise</h3></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl"><small>10/07 09:14 · m.tolno</small>Génération de la paie de juillet (24 bulletins, brouillon).</div>
              <div className="tl gold"><small>09/07 15:02 · support@nexsirh</small><b>Accès support</b> (45 min, autorisé par le client) — ticket #248.</div>
              <div className="tl"><small>30/06 17:40 · m.tolno</small>Clôture de la paie de juin — 24 bulletins archivés.</div>
              <div className="tl"><small>24/06 10:05 · stripe</small>Conversion essai → <b>Business</b>. Première facture payée.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
