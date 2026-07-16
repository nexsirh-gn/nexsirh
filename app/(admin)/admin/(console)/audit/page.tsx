"use client";

import { useToast } from "@/components/providers";

export default function Audit() {
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <div className="srch" style={{ width: 260 }}><input placeholder="Filtrer par email, entreprise, action…" /></div>
        <select style={{ width: 180 }}><option>Toutes les actions</option><option>Connexions console</option><option>Accès support</option><option>Barèmes</option><option>Suspensions</option></select>
        <span className="sp" />
        <button className="btn btn-o btn-sm" onClick={() => toast("Export CSV du journal d’audit généré (signé)")}>⇩ Export signé</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Date · heure</th><th>Acteur</th><th>Action</th><th>Cible</th><th>IP</th></tr>
            <tr><td className="mono">12/07 09:41</td><td>admin@nexsirh.gn</td><td><span className="bg bg-b">Connexion console (2FA ✓)</span></td><td>—</td><td className="mono">102.176.44.10</td></tr>
            <tr><td className="mono">09/07 15:02</td><td>support@nexsirh.gn</td><td><span className="bg bg-o">Accès support (45 min)</span></td><td>GARAYA HOLDING · autorisé par m.tolno</td><td className="mono">102.176.44.12</td></tr>
            <tr><td className="mono">05/07 11:20</td><td>admin@nexsirh.gn</td><td><span className="bg bg-v">Code promo créé</span></td><td>LANCEMENT26 (-20 %, 3 mois)</td><td className="mono">102.176.44.10</td></tr>
            <tr><td className="mono">01/07 08:00</td><td>système</td><td><span className="bg bg-g">Annonce diffusée</span></td><td>« Portail employé » — 49 entreprises</td><td>—</td></tr>
            <tr><td className="mono">28/06 16:44</td><td>inconnu</td><td><span className="bg bg-r">Échec connexion ×5 — IP bloquée 24 h</span></td><td>console admin</td><td className="mono">45.140.17.88</td></tr>
            <tr><td className="mono">21/06 03:00</td><td>admin@nexsirh.gn</td><td><span className="bg bg-o">Migration base appliquée</span></td><td>v1.4 — index paie</td><td className="mono">102.176.44.10</td></tr>
          </tbody>
        </table>
        <div className="pgn">
          <span>2 481 événements · conservation 5 ans · journal inviolable (append-only)</span>
          <div className="pgs"><button className="on">1</button><button>2</button><button>›</button></div>
        </div>
      </div>
    </div>
  );
}
