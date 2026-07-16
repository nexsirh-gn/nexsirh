"use client";

import { useModal, useToast } from "@/components/providers";

const MOIS = ["Juin 2026", "Mai 2026", "Avril 2026"];

export default function MesBulletins() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div className="panel">
      <div className="hd"><h3>Mes bulletins de paie</h3></div>
      <table>
        <tbody>
          <tr><th>Période</th><th className="num">Brut</th><th className="num">Net perçu</th><th></th></tr>
          {MOIS.map((m) => (
            <tr key={m}>
              <td>{m}</td>
              <td className="gnf">2 389 000</td>
              <td className="gnf"><b>2 233 773</b></td>
              <td>
                <button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Aperçu</button>{" "}
                <button className="btn btn-g btn-sm" onClick={() => toast("Téléchargement du PDF…")}>⇩ PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
