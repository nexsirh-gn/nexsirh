"use client";

import Link from "next/link";
import { useModal } from "@/components/providers";

export default function Dashboard() {
  const { om } = useModal();
  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="l">Effectif actif</div><div className="v">24</div><div className="d"><b>+2</b> embauches ce trimestre</div></div>
        <div className="kpi gold"><div className="l">Masse salariale · Juin</div><div className="v">78 431 000 <span style={{ fontSize: 13, color: "var(--gris)" }}>GNF</span></div><div className="d">Coût employeur : <b className="mono">92 118 400</b></div></div>
        <div className="kpi"><div className="l">Congés en attente</div><div className="v">3</div><div className="d">dont 1 &gt; 5 jours ouvrables</div></div>
        <div className="kpi">
          <div className="l">Paie de juillet</div>
          <div className="v" style={{ fontSize: 16, paddingTop: 6 }}><span className="bg bg-o">Brouillon — 24/24 bulletins</span></div>
          <div className="d"><Link className="link" href="/paie">Ouvrir le cycle de paie →</Link></div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Masse salariale — 6 derniers mois</h3><span className="sp" /><span className="bg bg-v">Brut · GNF</span></div>
          <div className="bd">
            <div className="bars">
              <div className="bar"><i style={{ height: "62%" }} /><small>Fév</small></div>
              <div className="bar"><i style={{ height: "64%" }} /><small>Mar</small></div>
              <div className="bar"><i style={{ height: "63%" }} /><small>Avr</small></div>
              <div className="bar"><i style={{ height: "70%" }} /><small>Mai</small></div>
              <div className="bar"><i style={{ height: "72%" }} /><small>Juin</small></div>
              <div className="bar hl"><i style={{ height: "74%" }} /><small>Juil</small></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Alertes RH</h3><span className="sp" /><span className="bg bg-r">4</span></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            <div className="alert rg"><span className="ic">⚠</span><div><b>CDD — SYLLA Aboubacar</b> arrive à échéance le 31/07/2026 (19 jours).</div></div>
            <div className="alert or"><span className="ic">🪪</span><div><b>Pièce d’identité — CAMARA Bountouraby</b> expire le 04/08/2026.</div></div>
            <div className="alert or"><span className="ic">🕒</span><div><b>Période d’essai — DIALLO Fatoumata</b> à confirmer avant le 20/07.</div></div>
            <div className="alert vt"><span className="ic">🎉</span><div><b>Ancienneté — BARRY Moussa</b> atteint 10 ans le 12/01/2026 : +2 j de congés.</div></div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Demandes de congés à traiter</h3><span className="sp" /><Link className="link" href="/conges">Tout voir →</Link></div>
          <table>
            <tbody>
              <tr><th>Salarié</th><th>Type</th><th>Période</th><th className="num">Jours</th><th>Statut</th><th></th></tr>
              <tr>
                <td><div className="emp"><span className="av g">BC</span><div><b>CAMARA Bountouraby</b><small>Formatrice · D.R.H</small></div></div></td>
                <td>Congé annuel</td><td>04 – 15 août</td><td className="gnf mono">9</td>
                <td><span className="bg bg-o">Attente RH</span></td>
                <td><button className="btn btn-o btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
              <tr>
                <td><div className="emp"><span className="av g">OC</span><div><b>CONTE Ousmane</b><small>Contrôleur · Conformité</small></div></div></td>
                <td>Permission</td><td>21 juillet</td><td className="gnf mono">1</td>
                <td><span className="bg bg-b">Attente manager</span></td>
                <td><button className="btn btn-o btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
              <tr>
                <td><div className="emp"><span className="av g">AT</span><div><b>TRAORE Aminata</b><small>Caissière · DAF</small></div></div></td>
                <td>Congé maladie</td><td>10 – 11 juillet</td><td className="gnf mono">2</td>
                <td><span className="bg bg-o">Attente RH</span></td>
                <td><button className="btn btn-o btn-sm" onClick={() => om("mValiderConge")}>Traiter</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Répartition de l’effectif</h3></div>
          <div className="bd" style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <div className="donut" />
            <div className="leg">
              <div><i style={{ background: "var(--vert)" }} /><b>11</b> — DAF &amp; Comptabilité</div>
              <div><i style={{ background: "var(--or)" }} /><b>6</b> — D.R.H &amp; Formation</div>
              <div><i style={{ background: "var(--bleu)" }} /><b>4</b> — Conformité</div>
              <div><i style={{ background: "#B9CCC5" }} /><b>3</b> — Direction générale</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
