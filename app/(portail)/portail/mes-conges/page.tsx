"use client";

import { useModal } from "@/components/providers";

export default function MesConges() {
  const { om } = useModal();
  return (
    <div>
      <div className="tools">
        <span className="note">Solde disponible : <b className="mono">12,5 jours ouvrables</b></span>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => om("mDemandeConge")}>+ Demander un congé</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Type</th><th>Période</th><th className="num">Jours</th><th>Statut</th></tr>
            <tr><td>Congé annuel</td><td>04 – 15 août 2026</td><td className="gnf mono">9</td><td><span className="bg bg-o">Validation RH en cours</span></td></tr>
            <tr><td>Congé annuel</td><td>23 – 27 décembre 2025</td><td className="gnf mono">4</td><td><span className="bg bg-v">Approuvée</span></td></tr>
            <tr><td>Permission (naissance)</td><td>02 octobre 2025</td><td className="gnf mono">1</td><td><span className="bg bg-v">Approuvée</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
