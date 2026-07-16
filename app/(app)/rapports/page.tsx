"use client";

import { useToast } from "@/components/providers";

export default function Rapports() {
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <button className="chip on">2026</button>
        <button className="chip">2025</button>
        <span className="sp" />
        <button className="btn btn-o" onClick={() => toast("Export Excel du bilan social généré")}>⇩ Bilan social Excel</button>
        <button className="btn btn-o" onClick={() => toast("Connexion Power BI : lien de source de données copié")}>◫ Source Power BI</button>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Coût employeur par mois (GNF)</h3></div>
          <div className="bd">
            <div className="bars">
              {[["58%", "Jan"], ["60%", "Fév"], ["61%", "Mar"], ["60%", "Avr"], ["66%", "Mai"], ["69%", "Juin"]].map(([h, m]) => (
                <div key={m} className="bar"><i style={{ height: h }} /><small>{m}</small></div>
              ))}
              <div className="bar hl"><i style={{ height: "71%" }} /><small>Juil</small></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Indicateurs annuels</h3></div>
          <div className="bd">
            <div className="stat-line"><span>Taux d’absentéisme</span><b className="mono">2,4 %</b></div>
            <div className="stat-line"><span>Turnover (12 mois glissants)</span><b className="mono">8,3 %</b></div>
            <div className="stat-line"><span>Ancienneté moyenne</span><b className="mono">6,8 ans</b></div>
            <div className="stat-line"><span>Âge moyen</span><b className="mono">34,2 ans</b></div>
            <div className="stat-line"><span>Ratio femmes / hommes</span><b className="mono">42 % / 58 %</b></div>
            <div className="stat-line"><span>Cumul RTS versé 2026</span><b className="gnf">7 316 480</b></div>
            <div className="stat-line"><span>Cumul CNSS (sal. + pat.) 2026</span><b className="gnf">16 905 000</b></div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>États prêts à imprimer</h3></div>
        <table>
          <tbody>
            <tr><td>📄 État des effectifs par département</td><td><button className="btn btn-o btn-sm" onClick={() => toast("PDF généré")}>Générer</button></td></tr>
            <tr><td>📄 Registre de l’employeur (inspection du travail)</td><td><button className="btn btn-o btn-sm" onClick={() => toast("PDF généré")}>Générer</button></td></tr>
            <tr><td>📄 Synthèse masse salariale annuelle</td><td><button className="btn btn-o btn-sm" onClick={() => toast("PDF généré")}>Générer</button></td></tr>
            <tr><td>📄 État des contrats à échéance</td><td><button className="btn btn-o btn-sm" onClick={() => toast("PDF généré")}>Générer</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
