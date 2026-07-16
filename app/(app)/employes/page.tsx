"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";

const EMPLOYES = [
  { ini: "AF", nom: "FAYE Aboubacar", email: "faye.a@garaya.gn", mat: "EMP-002", poste: "Comptable · DAF", contrat: "CDI", salaire: "3 000 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "MT", nom: "TOLNO Michel", email: "m.tolno@garaya.gn", mat: "EMP-004", poste: "D.R.H · D.R.H", contrat: "CDI", salaire: "2 500 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "AT", nom: "TRAORE Aminata", email: "a.traore@garaya.gn", mat: "EMP-005", poste: "Caissière · DAF", contrat: "CDI", salaire: "2 000 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "AS", nom: "SYLLA Aboubacar", email: "a.sylla@garaya.gn", mat: "EMP-006", poste: "Facturier · Conformité", contrat: <span className="bg bg-r">CDD — 31/07</span>, salaire: "1 500 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "BC", nom: "CAMARA Bountouraby", email: "b.camara@garaya.gn", mat: "EMP-007", poste: "Formatrice · D.R.H", contrat: "CDI", salaire: "1 600 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "MB", nom: "BARRY Moussa", email: "m.barry@garaya.gn", mat: "EMP-008", poste: "Formateur · D.R.H", contrat: "CDI", salaire: "1 800 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "GP", nom: "PLEGNEMOU Gassim", email: "g.plegnemou@garaya.gn", mat: "EMP-009", poste: "R.A.F · DAF", contrat: "CDI", salaire: "3 500 000", statut: <span className="bg bg-v">Actif</span> },
  { ini: "FD", nom: "DIALLO Fatoumata", email: "f.diallo@garaya.gn", mat: "EMP-024", poste: "Assistante RH · D.R.H", contrat: "CDI", salaire: "1 700 000", statut: <span className="bg bg-o">Période d’essai</span> },
];

export default function Employes() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="tools">
        <div className="srch" style={{ width: 300 }}><input placeholder="Nom, matricule, poste…" /></div>
        <button className="chip on">Tous · 24</button>
        <button className="chip">Actifs · 22</button>
        <button className="chip">CDD · 5</button>
        <button className="chip">En essai · 2</button>
        <button className="chip">Sortis · 2</button>
        <span className="sp" />
        <button className="btn btn-o btn-sm" onClick={() => toast("Export Excel généré — employes_2026-07.xlsx")}>⇩ Exporter</button>
        <button className="btn btn-o btn-sm" onClick={() => toast("Assistant d’import CSV/Excel ouvert")}>⇪ Importer</button>
        <button className="btn btn-p btn-sm" onClick={() => om("mNouvelEmploye")}>+ Nouvel employé</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Salarié</th><th>Matricule</th><th>Poste · Département</th><th>Contrat</th><th className="num">Salaire de base</th><th>Statut</th><th></th></tr>
            {EMPLOYES.map((e) => (
              <tr key={e.mat}>
                <td><div className="emp"><span className="av g">{e.ini}</span><div><b>{e.nom}</b><small>{e.email}</small></div></div></td>
                <td className="mono">{e.mat}</td>
                <td>{e.poste}</td>
                <td>{e.contrat}</td>
                <td className="gnf">{e.salaire}</td>
                <td>{e.statut}</td>
                <td><Link className="btn btn-g btn-sm" href="/employes/emp-002">Ouvrir →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pgn">
          <span>24 salariés — page 1 sur 3</span>
          <div className="pgs"><button className="on">1</button><button>2</button><button>3</button><button>›</button></div>
        </div>
      </div>
    </div>
  );
}
