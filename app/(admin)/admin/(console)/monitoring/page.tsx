"use client";

import { useToast } from "@/components/providers";

export default function Monitoring() {
  const toast = useToast();
  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="l">Disponibilité 30 j</div><div className="v">99,98 %</div><div className="d">1 incident mineur (22 min)</div></div>
        <div className="kpi"><div className="l">Latence médiane API</div><div className="v">210 ms</div><div className="d">p95 : <span className="mono">640 ms</span></div></div>
        <div className="kpi"><div className="l">Base de données</div><div className="v">41 %</div><div className="d">3,2 Go / 8 Go · sauvegarde 04:00 ✓</div></div>
        <div className="kpi"><div className="l">Erreurs 24 h</div><div className="v">7</div><div className="d">0 critique · 7 mineures</div></div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Tâches planifiées (cron)</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Toutes les tâches relancées manuellement ↻")}>↻ Tout relancer</button></div>
          <table>
            <tbody>
              <tr><th>Tâche</th><th>Fréquence</th><th>Dernière exécution</th><th>Statut</th><th></th></tr>
              <tr><td>Alertes RH (CDD, pièces, essais)</td><td>Quotidien 06:00</td><td>Auj. 06:00 · 1,2 s</td><td><span className="sev ok" />OK</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Tâche exécutée ✓ (1,1 s)")}>▶</button></td></tr>
              <tr><td>Emails essais expirants</td><td>Quotidien 08:00</td><td>Auj. 08:00 · 0,8 s</td><td><span className="sev ok" />OK</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Tâche exécutée ✓")}>▶</button></td></tr>
              <tr><td>Relances impayés (Stripe)</td><td>Quotidien 09:00</td><td>Auj. 09:00 · 2,1 s</td><td><span className="sev warn" />2 échecs client</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Tâche exécutée — 2 impayés toujours en échec")}>▶</button></td></tr>
              <tr><td>Sauvegarde base + Storage</td><td>Quotidien 04:00</td><td>Auj. 04:00 · 3 min</td><td><span className="sev ok" />OK</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Sauvegarde manuelle lancée 💾")}>▶</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Journal des incidents</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Incident déclaré — page de statut mise à jour")}>+ Déclarer</button></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl"><small>08/07 14:10 – 14:32 · mineur</small><b>Lenteur génération PDF</b> — pic de charge (fin de mois). Résolu : file d’attente augmentée.</div>
              <div className="tl"><small>21/06 03:00 – 03:05 · maintenance</small><b>Migration base v1.4</b> — ajout des index paie. Sans interruption.</div>
              <div className="tl"><small>12/06 · info</small><b>Mise en production initiale</b> 🎉</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
