"use client";

import { useModal, useToast } from "@/components/providers";

export default function Annonces() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <span className="note">Bannières in-app et emails envoyés aux entreprises clientes.</span>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => om("mAnnonce")}>+ Nouvelle annonce</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Annonce</th><th>Canal</th><th>Cible</th><th>Envoyée</th><th>Perf.</th><th></th></tr>
            <tr><td><b>🎉 Nouveau : portail employé disponible</b></td><td>Email + bannière</td><td>Tous les clients (49)</td><td>01/07</td><td className="mono">72 % ouverture</td><td><button className="btn btn-g btn-sm" onClick={() => om("mAnnonce")}>Dupliquer</button></td></tr>
            <tr><td><b>⏳ Votre essai expire dans 5 jours</b></td><td>Email auto</td><td>Essais j.25+</td><td>automatique</td><td className="mono">41 % → conversion</td><td><button className="btn btn-g btn-sm" onClick={() => om("mAnnonce")}>✎ Modifier</button></td></tr>
            <tr><td><b>🔧 Maintenance planifiée dim. 19/07, 22 h – 23 h</b></td><td>Bannière in-app</td><td>Tous</td><td>programmée 17/07</td><td>—</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Annonce programmée annulée")}>Annuler</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
