"use client";

import { useModal, useToast } from "@/components/providers";

export default function Baremes() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="alert or" style={{ maxWidth: 900 }}>
        <span className="ic">⚖</span>
        <div><b>Référentiels partagés par toutes les entreprises.</b> Chaque modification crée une <b>nouvelle version datée</b> : les paies déjà clôturées restent calculées avec l’ancienne version. Toute publication est journalisée et notifiée aux clients.</div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="hd"><h3>Barème RTS — versions</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mBareme")}>+ Nouvelle version</button></div>
          <table>
            <tbody>
              <tr><th>Version</th><th>En vigueur du</th><th>Tranches</th><th>Statut</th><th></th></tr>
              <tr><td className="mono">v2026.1</td><td>01/01/2026</td><td>5 / 8 / 10 / 15 %</td><td><span className="bg bg-v">Active</span></td><td><button className="btn btn-g btn-sm" onClick={() => om("mBareme")}>Voir</button></td></tr>
              <tr><td className="mono">v2025.1</td><td>01/01/2025 – 31/12/2025</td><td>5 / 8 / 10 / 15 %</td><td><span className="bg bg-g">Archivée</span></td><td><button className="btn btn-g btn-sm" onClick={() => om("mBareme")}>Voir</button></td></tr>
            </tbody>
          </table>
          <div className="bd">
            <table>
              <tbody>
                <tr><th>Tranche (net imposable)</th><th className="num">Taux v2026.1</th></tr>
                <tr><td>0 – 2 000 000 GNF</td><td className="gnf"><b>5 %</b></td></tr>
                <tr><td>2 000 000 – 5 000 000</td><td className="gnf"><b>8 %</b></td></tr>
                <tr><td>5 000 000 – 10 000 000</td><td className="gnf"><b>10 %</b></td></tr>
                <tr><td>Au-delà de 10 000 000</td><td className="gnf"><b>15 %</b></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="hd"><h3>Cotisations sociales</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => om("mBareme")}>✎ Nouvelle version</button></div>
            <table>
              <tbody>
                <tr><th>Cotisation</th><th className="num">Sal.</th><th className="num">Pat.</th><th>Base / plafond</th></tr>
                <tr><td><b>CNSS</b></td><td className="gnf">5 %</td><td className="gnf">18 %</td><td>plafond <span className="mono">2 500 000</span></td></tr>
                <tr><td><b>Versement Forfaitaire</b></td><td className="gnf">—</td><td className="gnf">6 %</td><td>brut − indemn. exonérées</td></tr>
                <tr><td><b>CFPA</b></td><td className="gnf">—</td><td className="gnf">1,5 %</td><td>total brut</td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="hd"><h3>Jours fériés — Guinée 2026</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Jour férié ajouté et poussé vers les 49 entreprises 🗓")}>+ Ajouter</button></div>
            <div className="bd" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="bg bg-g">01/01 Nouvel An</span><span className="bg bg-b">20/03 Aïd el-Fitr</span><span className="bg bg-g">01/05 Fête du Travail</span>
              <span className="bg bg-b">27/05 Tabaski</span><span className="bg bg-g">27/08 Martyrs</span><span className="bg bg-g">02/10 Indépendance</span><span className="bg bg-g">25/12 Noël</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
