"use client";

import { useModal, useToast } from "@/components/providers";

export default function Support() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <button className="chip on">Ouverts · 7</button>
        <button className="chip">Urgents · 1</button>
        <button className="chip">En attente client · 3</button>
        <button className="chip">Résolus (30 j) · 41</button>
        <span className="sp" />
        <span className="note">Temps de 1re réponse (30 j) : <b className="mono">1 h 42</b> · Satisfaction : <b className="mono">4,7/5</b></span>
      </div>

      <div className="panel">
        <table>
          <tbody>
            <tr><th>#</th><th>Sujet</th><th>Entreprise</th><th>Priorité</th><th>Assigné à</th><th>Ouvert</th><th>Statut</th><th></th></tr>
            <tr><td className="mono">248</td><td><b>Écart RTS sur bulletin de M. Plegnemou</b></td><td>GARAYA HOLDING</td><td><span className="bg bg-r">Urgent</span></td><td>Aïssatou D.</td><td>il y a 3 h</td><td><span className="bg bg-o">En cours</span></td><td><button className="btn btn-p btn-sm" onClick={() => om("mTicket")}>Ouvrir</button></td></tr>
            <tr><td className="mono">247</td><td>Import Excel : colonnes non reconnues</td><td>SOGUIPAH SARL</td><td><span className="bg bg-o">Normal</span></td><td>Mamadou K.</td><td>hier</td><td><span className="bg bg-b">Attente client</span></td><td><button className="btn btn-o btn-sm" onClick={() => om("mTicket")}>Ouvrir</button></td></tr>
            <tr><td className="mono">246</td><td>Demande : paiement Orange Money</td><td>INJELEC-GUINÉE</td><td><span className="bg bg-g">Basse</span></td><td>—</td><td>08/07</td><td><span className="bg bg-o">Ouvert</span></td><td><button className="btn btn-o btn-sm" onClick={() => om("mTicket")}>Ouvrir</button></td></tr>
            <tr><td className="mono">245</td><td>Réinitialisation 2FA de l’admin</td><td>PHARMA PLUS</td><td><span className="bg bg-o">Normal</span></td><td>Aïssatou D.</td><td>07/07</td><td><span className="bg bg-v">Résolu</span></td><td><button className="btn btn-g btn-sm" onClick={() => om("mTicket")}>Voir</button></td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Sujets récurrents (30 j)</h3></div>
          <div className="bd">
            <div className="hbar"><span className="nm">Import de données</span><div className="tr"><i style={{ width: "80%" }} /></div><b className="mono">12 tickets</b></div>
            <div className="hbar"><span className="nm">Questions paie/RTS</span><div className="tr"><i style={{ width: "60%" }} /></div><b className="mono">9</b></div>
            <div className="hbar"><span className="nm">Facturation</span><div className="tr"><i style={{ width: "33%" }} /></div><b className="mono">5</b></div>
            <div className="hbar"><span className="nm">Accès / 2FA</span><div className="tr"><i style={{ width: "27%" }} /></div><b className="mono">4</b></div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Base de connaissances</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Éditeur d’article ouvert")}>+ Article</button></div>
          <table>
            <tbody>
              <tr><td>📘 Importer vos salariés depuis Excel</td><td className="mono">1 204 vues</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Article ouvert dans l’éditeur")}>✎</button></td></tr>
              <tr><td>📘 Comprendre le calcul de la RTS</td><td className="mono">861 vues</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Article ouvert dans l’éditeur")}>✎</button></td></tr>
              <tr><td>📘 Clôturer une paie et régulariser</td><td className="mono">644 vues</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Article ouvert dans l’éditeur")}>✎</button></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
