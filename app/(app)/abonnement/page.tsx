"use client";

import { useModal, useToast } from "@/components/providers";

export default function Abonnement() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="alert or" style={{ maxWidth: 860 }}>
        <span className="ic">⏳</span>
        <div><b>Essai gratuit — 12 jours restants.</b> Choisissez un plan avant le 24/07/2026 pour conserver l’accès complet. Vos données sont conservées dans tous les cas.</div>
      </div>

      <div className="plans" style={{ maxWidth: 980, marginTop: 16 }}>
        <div className="plan">
          <h4>Starter</h4>
          <div className="px">450 000 <small>GNF / mois</small></div>
          <p className="note">Jusqu’à 15 salariés</p>
          <ul><li>Personnel, paie, congés</li><li>Bulletins &amp; documents PDF</li><li>3 comptes utilisateurs</li></ul>
          <button className="btn btn-o" style={{ width: "100%", justifyContent: "center" }} onClick={() => om("mPlan")}>Choisir Starter</button>
        </div>
        <div className="plan hl">
          <span className="tag">Recommandé</span>
          <h4>Business</h4>
          <div className="px">950 000 <small>GNF / mois</small></div>
          <p className="note">Jusqu’à 50 salariés</p>
          <ul><li>Tout Starter, plus :</li><li>Temps &amp; heures supplémentaires</li><li>Portail employé libre-service</li><li>Utilisateurs illimités · rapports avancés</li></ul>
          <button className="btn btn-p" style={{ width: "100%", justifyContent: "center" }} onClick={() => om("mPlan")}>Choisir Business</button>
        </div>
        <div className="plan">
          <h4>Cabinet</h4>
          <div className="px">Sur devis</div>
          <p className="note">Cabinets comptables multi-dossiers</p>
          <ul><li>Plusieurs entreprises, un compte</li><li>Facturation consolidée</li><li>Accompagnement dédié</li></ul>
          <button className="btn btn-o" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Demande envoyée — nous vous recontactons sous 24 h")}>Nous contacter</button>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 980, marginTop: 20 }}>
        <div className="hd"><h3>Factures</h3></div>
        <table>
          <tbody>
            <tr><th>N°</th><th>Période</th><th className="num">Montant</th><th>Statut</th><th></th></tr>
            <tr><td className="mono">—</td><td>Essai gratuit (24/06 – 24/07)</td><td className="gnf">0</td><td><span className="bg bg-v">Actif</span></td><td></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
