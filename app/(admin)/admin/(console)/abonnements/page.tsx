"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";

export default function Abonnements() {
  const { om } = useModal();
  const toast = useToast();
  const fiche = "/admin/entreprises/garaya-holding";
  return (
    <div>
      <div className="kpis">
        <div className="kpi gold"><div className="l">MRR</div><div className="v mrr" style={{ fontSize: 24 }}>31 450 000</div><div className="d">GNF · 40 abonnements payants</div></div>
        <div className="kpi">
          <div className="l">Répartition</div>
          <div className="d" style={{ marginTop: 10 }}>
            <div className="hbar"><span className="nm">Business ×24</span><div className="tr"><i style={{ width: "73%" }} /></div><b className="gnf">22,8 M</b></div>
            <div className="hbar"><span className="nm">Starter ×14</span><div className="tr"><i style={{ width: "20%" }} /></div><b className="gnf">6,3 M</b></div>
            <div className="hbar"><span className="nm">Cabinet ×2</span><div className="tr"><i className="o" style={{ width: "15%" }} /></div><b className="gnf">4,8 M</b></div>
          </div>
        </div>
        <div className="kpi"><div className="l">Encaissé en juillet</div><div className="v">28 730 000</div><div className="d">2 paiements en échec</div></div>
        <div className="kpi"><div className="l">Conversion essais (90 j)</div><div className="v">52 %</div><div className="d">11 conversions / 21 essais</div></div>
      </div>

      <div className="panel">
        <div className="hd">
          <h3>Paiements &amp; impayés</h3><span className="sp" />
          <button className="chip on">Tous</button><button className="chip">Impayés · 2</button><button className="chip">À échéance 7 j · 6</button>
        </div>
        <table>
          <tbody>
            <tr><th>Entreprise</th><th>Plan</th><th className="num">Montant</th><th>Échéance</th><th>Moyen</th><th>Statut</th><th></th></tr>
            <tr><td><b>INJELEC-GUINÉE</b></td><td>Business</td><td className="gnf">950 000</td><td>30/06 <b style={{ color: "var(--rouge)" }}>(j.+12)</b></td><td>Carte •••• 8810</td><td><span className="bg bg-r">Échec ×3</span></td><td><button className="btn btn-p btn-sm" onClick={() => om("mRelance")}>Relancer</button></td></tr>
            <tr><td><b>BTP KANKAN SARL</b></td><td>Starter</td><td className="gnf">450 000</td><td>05/07 <b style={{ color: "var(--rouge)" }}>(j.+7)</b></td><td>Virement manuel</td><td><span className="bg bg-r">En attente</span></td><td><button className="btn btn-p btn-sm" onClick={() => om("mRelance")}>Relancer</button> <button className="btn btn-o btn-sm" onClick={() => toast("Paiement par virement marqué comme reçu ✓")}>✓ Reçu</button></td></tr>
            <tr><td><b>GARAYA HOLDING</b></td><td>Business</td><td className="gnf">950 000</td><td>24/08</td><td>Carte •••• 4242</td><td><span className="bg bg-v">À jour</span></td><td><Link className="btn btn-g btn-sm" href={fiche}>Fiche</Link></td></tr>
            <tr><td><b>CABINET FIDUCIAIRE CKY</b></td><td>Cabinet</td><td className="gnf">2 400 000</td><td>01/08</td><td>Virement</td><td><span className="bg bg-v">À jour</span></td><td><Link className="btn btn-g btn-sm" href={fiche}>Fiche</Link></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
