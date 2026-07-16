"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";

export default function Entreprises() {
  const { om } = useModal();
  const toast = useToast();
  const fiche = "/admin/entreprises/garaya-holding";
  return (
    <div>
      <div className="tools">
        <div className="srch" style={{ width: 280 }}><input placeholder="Nom, NIF, email admin…" /></div>
        <button className="chip on">Toutes · 49</button>
        <button className="chip">Actives · 38</button>
        <button className="chip">Essais · 9</button>
        <button className="chip">Impayées · 2</button>
        <button className="chip">Suspendues · 0</button>
        <span className="sp" />
        <button className="btn btn-o btn-sm" onClick={() => toast("Export Excel des entreprises généré")}>⇩ Exporter</button>
        <button className="btn btn-p btn-sm" onClick={() => om("mNouvelleEntreprise")}>+ Créer une entreprise</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Entreprise</th><th>Plan</th><th className="num">Salariés</th><th className="num">Utilisateurs</th><th className="num">MRR (GNF)</th><th>Dernière paie</th><th>Statut</th><th></th></tr>
            <tr>
              <td><b>GARAYA HOLDING</b><br /><small style={{ color: "var(--gris)" }}>NIF 375106275 · Ratoma</small></td>
              <td><span className="bg bg-v">Business</span></td><td className="gnf mono">24</td><td className="gnf mono">6</td><td className="gnf">950 000</td><td>Juin — clôturée</td>
              <td><span className="bg bg-v">Active</span></td>
              <td><Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
            <tr>
              <td><b>INJELEC-GUINÉE</b><br /><small style={{ color: "var(--gris)" }}>Électricité · Kaloum</small></td>
              <td><span className="bg bg-v">Business</span></td><td className="gnf mono">42</td><td className="gnf mono">9</td><td className="gnf">950 000</td><td>Juin — clôturée</td>
              <td><span className="bg bg-r">Impayée — j.12</span></td>
              <td><button className="btn btn-o btn-sm" onClick={() => om("mRelance")}>Relancer</button> <Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
            <tr>
              <td><b>ENGUITRACI SARLU</b><br /><small style={{ color: "var(--gris)" }}>Transport · Kaloum · NIF 375106275</small></td>
              <td><span className="bg bg-v">Starter</span></td><td className="gnf mono">17</td><td className="gnf mono">2</td><td className="gnf">450 000</td><td>Juin — clôturée</td>
              <td><span className="bg bg-v">Active</span></td>
              <td><Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
            <tr>
              <td><b>CABINET FIDUCIAIRE CKY</b><br /><small style={{ color: "var(--gris)" }}>Expertise comptable · 6 dossiers</small></td>
              <td><span className="bg bg-b">Cabinet</span></td><td className="gnf mono">128</td><td className="gnf mono">4</td><td className="gnf">2 400 000</td><td>Juin ✓ (6/6)</td>
              <td><span className="bg bg-v">Active</span></td>
              <td><Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
            <tr>
              <td><b>SOGUIPAH SARL</b><br /><small style={{ color: "var(--gris)" }}>Agro-industrie · Conakry</small></td>
              <td><span className="bg bg-o">Essai j.24/30</span></td><td className="gnf mono">31</td><td className="gnf mono">3</td><td className="gnf">—</td><td>Juin (brouillon)</td>
              <td><span className="bg bg-o">Essai</span></td>
              <td><Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
            <tr>
              <td><b>PHARMA PLUS SARLU</b><br /><small style={{ color: "var(--gris)" }}>Santé · Dixinn</small></td>
              <td><span className="bg bg-v">Starter</span></td><td className="gnf mono">8</td><td className="gnf mono">2</td><td className="gnf">450 000</td><td>Juin — clôturée</td>
              <td><span className="bg bg-v">Active</span></td>
              <td><Link className="btn btn-o btn-sm" href={fiche}>Ouvrir</Link></td>
            </tr>
          </tbody>
        </table>
        <div className="pgn">
          <span>49 entreprises · 1 314 salariés gérés au total</span>
          <div className="pgs"><button className="on">1</button><button>2</button><button>3</button><button>›</button></div>
        </div>
      </div>
    </div>
  );
}
