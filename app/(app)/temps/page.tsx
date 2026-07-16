"use client";

import { useToast } from "@/components/providers";

export default function Temps() {
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <select style={{ width: 190 }}><option>Juillet 2026</option><option>Juin 2026</option></select>
        <select style={{ width: 210 }}><option>Tous les départements</option><option>DAF</option><option>D.R.H</option><option>Conformité</option></select>
        <span className="sp" />
        <button className="btn btn-o" onClick={() => toast("Feuilles de temps validées et transmises à la paie")}>✓ Valider et transmettre à la paie</button>
      </div>

      <div className="panel">
        <div className="hd"><h3>Récapitulatif mensuel — heures &amp; majorations</h3><span className="sp" /><span className="note">Base légale : 40 h/sem · 173,33 h/mois</span></div>
        <table>
          <tbody>
            <tr><th>Salarié</th><th className="num">H. travaillées</th><th className="num">HS +25 %</th><th className="num">HS +50 %</th><th className="num">HS +100 % <small>(dim./fériés)</small></th><th className="num">Montant HS (GNF)</th><th>Statut</th></tr>
            <tr><td><b>FAYE Aboubacar</b></td><td className="gnf">173,3</td><td className="gnf">—</td><td className="gnf">—</td><td className="gnf">—</td><td className="gnf">—</td><td><span className="bg bg-v">Validé</span></td></tr>
            <tr><td><b>SYLLA Aboubacar</b></td><td className="gnf">181,3</td><td className="gnf">8,0</td><td className="gnf">—</td><td className="gnf">—</td><td className="gnf">86 540</td><td><span className="bg bg-v">Validé</span></td></tr>
            <tr><td><b>CONTE Ousmane</b></td><td className="gnf">188,3</td><td className="gnf">8,0</td><td className="gnf">4,0</td><td className="gnf">3,0</td><td className="gnf">254 810</td><td><span className="bg bg-o">À valider</span></td></tr>
            <tr><td><b>BARRY Moussa</b></td><td className="gnf">166,3</td><td className="gnf">—</td><td className="gnf">—</td><td className="gnf">—</td><td className="gnf">—</td><td><span className="bg bg-o">À valider</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>Feuille de temps — CONTE Ousmane · semaine du 20 juillet</h3></div>
        <table>
          <tbody>
            <tr><th>Jour</th><th>Arrivée</th><th>Départ</th><th className="num">Heures</th><th className="num">Dont sup.</th><th>Note</th></tr>
            <tr><td>Lundi 20</td><td className="mono">08:00</td><td className="mono">17:00</td><td className="gnf">8,0</td><td className="gnf">—</td><td></td></tr>
            <tr><td>Mardi 21</td><td className="mono">08:00</td><td className="mono">19:00</td><td className="gnf">10,0</td><td className="gnf" style={{ color: "var(--vert)" }}><b>+2,0</b></td><td>Clôture trimestrielle</td></tr>
            <tr><td>Mercredi 22</td><td className="mono">08:00</td><td className="mono">18:30</td><td className="gnf">9,5</td><td className="gnf" style={{ color: "var(--vert)" }}><b>+1,5</b></td><td></td></tr>
            <tr><td>Dimanche 26</td><td className="mono">09:00</td><td className="mono">12:00</td><td className="gnf">3,0</td><td className="gnf" style={{ color: "var(--or)" }}><b>+3,0 (100 %)</b></td><td>Inventaire</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
