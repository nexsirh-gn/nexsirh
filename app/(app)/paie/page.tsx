"use client";

import { useModal, useToast } from "@/components/providers";

const BULLETINS = [
  { ini: "AF", nom: "FAYE Aboubacar", poste: "Comptable", brut: "3 745 000", cnss: "125 000", rts: "99 750", ret: "2 016 982", net: "1 503 268" },
  { ini: "MT", nom: "TOLNO Michel", poste: "D.R.H", brut: "3 355 000", cnss: "125 000", rts: "81 000", ret: "—", net: "3 149 000" },
  { ini: "GP", nom: "PLEGNEMOU Gassim", poste: "R.A.F", brut: "4 480 000", cnss: "125 000", rts: "146 800", ret: "—", net: "4 208 200" },
  { ini: "AT", nom: "TRAORE Aminata", poste: "Caissière", brut: "2 745 000", cnss: "125 000", rts: "50 500", ret: "—", net: "2 569 500" },
  { ini: "AS", nom: "SYLLA Aboubacar", poste: "Facturier", brut: "2 215 000", cnss: "110 750", rts: "29 463", ret: "—", net: "2 074 788" },
  { ini: "BC", nom: "CAMARA Bountouraby", poste: "Formatrice", brut: "2 389 000", cnss: "119 450", rts: "35 778", ret: "—", net: "2 233 773" },
];

export default function Paie() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <select style={{ width: 190 }}><option>Juillet 2026</option><option>Juin 2026 — Clôturé</option><option>Mai 2026 — Clôturé</option></select>
        <span className="bg bg-o">Brouillon</span>
        <span className="note">Générée le 10/07 · 24 bulletins · aucune anomalie détectée</span>
        <span className="sp" />
        <button className="btn btn-o" onClick={() => om("mRecalcul")}>↻ Recalculer tout</button>
        <button className="btn btn-o" onClick={() => om("mJournal")}>📒 Journal de paie</button>
        <button className="btn btn-or" onClick={() => om("mCloture")}>🔒 Clôturer la période</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Total brut</div><div className="v">79 214 000</div><div className="d">GNF · 24 salariés</div></div>
        <div className="kpi"><div className="l">Cotisations salariales</div><div className="v">4 918 730</div><div className="d">CNSS 5 % + RTS</div></div>
        <div className="kpi"><div className="l">Charges patronales</div><div className="v">15 872 410</div><div className="d">CNSS 18 % + VF 6 % + CFPA 1,5 %</div></div>
        <div className="kpi gold"><div className="l">Net à payer</div><div className="v">72 278 288</div><div className="d">virements du 31/07</div></div>
      </div>

      <div className="panel">
        <div className="hd"><h3>Bulletins — Juillet 2026</h3><span className="sp" /><div className="srch" style={{ width: 220 }}><input placeholder="Filtrer…" /></div></div>
        <table>
          <tbody>
            <tr><th>Salarié</th><th className="num">Brut</th><th className="num">CNSS sal.</th><th className="num">RTS</th><th className="num">Retenues</th><th className="num">Net à payer</th><th>Statut</th><th></th></tr>
            {BULLETINS.map((b) => (
              <tr key={b.nom}>
                <td><div className="emp"><span className="av g">{b.ini}</span><div><b>{b.nom}</b><small>{b.poste}</small></div></div></td>
                <td className="gnf">{b.brut}</td>
                <td className="gnf">{b.cnss}</td>
                <td className="gnf">{b.rts}</td>
                <td className="gnf" style={b.ret !== "—" ? { color: "var(--rouge)" } : undefined}>{b.ret}</td>
                <td className="gnf"><b>{b.net}</b></td>
                <td><span className="bg bg-o">Brouillon</span></td>
                <td><button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Bulletin</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pgn">
          <span>24 bulletins — total net <b className="mono">72 278 288 GNF</b></span>
          <div className="pgs"><button className="on">1</button><button>2</button><button>3</button><button>4</button></div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Déclarations à produire</h3></div>
          <table>
            <tbody>
              <tr><td>📄 État RTS mensuel — format eTax (DNI)</td><td className="gnf mono">1 245 730 GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => om("mDocsAdmin")}>Générer</button></td></tr>
              <tr><td>📄 Déclaration CNSS mensuelle</td><td className="gnf mono">14 328 700 GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => om("mDocsAdmin")}>Générer</button></td></tr>
              <tr><td>🏦 Ordre de virement groupé</td><td className="gnf mono">72 278 288 GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => toast("Fichier de virements exporté")}>Exporter</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Cycle de la période</h3></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl"><small>10/07 · M. Tolno</small><b>Génération</b> — 24 bulletins calculés en brouillon.</div>
              <div className="tl gold"><small>en attente</small><b>Validation</b> — contrôle des bulletins, recalcul possible.</div>
              <div className="tl" style={{ opacity: 0.45 }}><small>—</small><b>Clôture</b> — montants figés, archivage, verrouillage rétroactif.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
