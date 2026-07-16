"use client";

import { useModal, useToast } from "@/components/providers";

export default function Plans() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <span className="note">Les modifications s’appliquent aux <b>nouveaux abonnements</b> ; les clients existants conservent leur tarif (grandfathering).</span>
        <span className="sp" />
        <button className="btn btn-p btn-sm" onClick={() => om("mPlanEdit")}>+ Nouveau plan</button>
      </div>

      <div className="plans">
        <div className="plan">
          <h4>Starter</h4><div className="px">450 000 <small>GNF / mois</small></div>
          <p className="note">≤ 15 salariés · 14 clients actifs</p>
          <ul><li>Personnel, paie, congés</li><li>Documents PDF</li><li>3 utilisateurs</li></ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-o btn-sm" style={{ flex: 1 }} onClick={() => om("mPlanEdit")}>✎ Modifier</button>
            <button className="btn btn-g btn-sm" onClick={() => toast("Plan Starter archivé — plus proposé aux nouveaux clients")}>Archiver</button>
          </div>
        </div>
        <div className="plan hl">
          <span className="tag">Populaire</span>
          <h4>Business</h4><div className="px">950 000 <small>GNF / mois</small></div>
          <p className="note">≤ 50 salariés · 24 clients actifs</p>
          <ul><li>Tout Starter +</li><li>Temps &amp; heures sup.</li><li>Portail employé</li><li>Utilisateurs illimités</li></ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-o btn-sm" style={{ flex: 1 }} onClick={() => om("mPlanEdit")}>✎ Modifier</button>
            <button className="btn btn-g btn-sm" onClick={() => toast("Plan dupliqué en brouillon « Business annuel -15 % »")}>⧉ Dupliquer</button>
          </div>
        </div>
        <div className="plan">
          <h4>Cabinet</h4><div className="px">Sur devis</div>
          <p className="note">Multi-dossiers · 2 clients actifs</p>
          <ul><li>Plusieurs entreprises</li><li>Facturation consolidée</li><li>Support dédié</li></ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-o btn-sm" style={{ flex: 1 }} onClick={() => om("mPlanEdit")}>✎ Modifier</button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="hd"><h3>Codes promotionnels</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Code promo LANCEMENT26 créé : -20 % pendant 3 mois")}>+ Créer un code</button></div>
        <table>
          <tbody>
            <tr><th>Code</th><th>Remise</th><th>Utilisations</th><th>Expire</th><th>Statut</th><th></th></tr>
            <tr><td className="mono"><b>LANCEMENT26</b></td><td>-20 % · 3 mois</td><td className="mono">17 / 50</td><td>31/12/2026</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Code désactivé")}>Désactiver</button></td></tr>
            <tr><td className="mono"><b>CABINET10</b></td><td>-10 % · 12 mois</td><td className="mono">2 / 10</td><td>—</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Code désactivé")}>Désactiver</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
