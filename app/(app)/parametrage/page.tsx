"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

type PTab = "pt1" | "pt2" | "pt3" | "pt4" | "pt5" | "pt6";
const TABS: [PTab, string][] = [
  ["pt1", "Entreprise"],
  ["pt2", "Barème RTS"],
  ["pt3", "Cotisations"],
  ["pt4", "Jours fériés"],
  ["pt5", "Primes & absences"],
  ["pt6", "Utilisateurs"],
];

export default function Parametrage() {
  const [tab, setTab] = useState<PTab>("pt1");
  const { om } = useModal();
  const toast = useToast();

  return (
    <div>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "pt1" && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="hd"><h3>Informations de l’entreprise</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => toast("Modifications enregistrées")}>Enregistrer</button></div>
          <div className="bd fgrid">
            <div className="fld"><label>Raison sociale</label><input defaultValue="GARAYA HOLDING" /></div>
            <div className="fld"><label>Forme juridique</label><select><option>SARL</option></select></div>
            <div className="fld"><label>NIF</label><input className="mono" defaultValue="375106275" /></div>
            <div className="fld"><label>N° employeur CNSS</label><input className="mono" defaultValue="GH-2016-0448" /></div>
            <div className="fld w"><label>Adresse</label><input defaultValue="Kipé, Commune de Ratoma, Conakry" /></div>
            <div className="fld"><label>Convention collective</label><input defaultValue="Convention Collective du Travail" /></div>
            <div className="fld"><label>Banque de paie</label><input defaultValue="BIG — 461452510189" /></div>
          </div>
        </div>
      )}

      {tab === "pt2" && (
        <div>
          <div className="annot">
            Version en vigueur depuis le <b>01/01/2026</b> — modifiable sans redéploiement, historisée par date d’effet. Le barème erroné « 5 % jusqu’à 5 M » a été corrigé.
          </div>
          <div className="panel" style={{ maxWidth: 700 }}>
            <div className="hd"><h3>Barème RTS (retenue sur traitements et salaires)</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Nouvelle version de barème créée (brouillon)")}>+ Nouvelle version</button></div>
            <table>
              <tbody>
                <tr><th>Tranche</th><th className="num">Plancher (GNF)</th><th className="num">Plafond (GNF)</th><th className="num">Taux</th></tr>
                <tr><td className="mono">1</td><td className="gnf">0</td><td className="gnf">2 000 000</td><td className="gnf"><b>5 %</b></td></tr>
                <tr><td className="mono">2</td><td className="gnf">2 000 000</td><td className="gnf">5 000 000</td><td className="gnf"><b>8 %</b></td></tr>
                <tr><td className="mono">3</td><td className="gnf">5 000 000</td><td className="gnf">10 000 000</td><td className="gnf"><b>10 %</b></td></tr>
                <tr><td className="mono">4</td><td className="gnf">10 000 000</td><td className="gnf">—</td><td className="gnf"><b>15 %</b></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pt3" && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="hd"><h3>Cotisations sociales &amp; taxes</h3></div>
          <table>
            <tbody>
              <tr><th>Cotisation</th><th className="num">Part salariale</th><th className="num">Part patronale</th><th>Base / plafond</th></tr>
              <tr><td><b>CNSS</b></td><td className="gnf">5 %</td><td className="gnf">18 %</td><td>Brut plafonné à <span className="mono">2 500 000 GNF</span></td></tr>
              <tr><td><b>Versement Forfaitaire</b></td><td className="gnf">—</td><td className="gnf">6 %</td><td>Brut hors indemnités exonérées</td></tr>
              <tr><td><b>CFPA</b></td><td className="gnf">—</td><td className="gnf">1,5 %</td><td>Total brut</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "pt4" && (
        <div className="panel" style={{ maxWidth: 640 }}>
          <div className="hd"><h3>Jours fériés 2026 — République de Guinée</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Formulaire d’ajout de jour férié ouvert")}>+ Ajouter</button></div>
          <table>
            <tbody>
              <tr><td>1er janvier</td><td>Nouvel An</td><td><span className="bg bg-g">Fixe</span></td></tr>
              <tr><td>20 mars</td><td>Aïd el-Fitr</td><td><span className="bg bg-b">Variable</span></td></tr>
              <tr><td>1er mai</td><td>Fête du Travail</td><td><span className="bg bg-g">Fixe</span></td></tr>
              <tr><td>27 mai</td><td>Aïd el-Kébir (Tabaski)</td><td><span className="bg bg-b">Variable</span></td></tr>
              <tr><td>27 août</td><td>Journée des Martyrs</td><td><span className="bg bg-g">Fixe</span></td></tr>
              <tr><td>2 octobre</td><td>Fête de l’Indépendance</td><td><span className="bg bg-g">Fixe</span></td></tr>
              <tr><td>25 décembre</td><td>Noël</td><td><span className="bg bg-g">Fixe</span></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "pt5" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Types de primes &amp; indemnités</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Formulaire nouvelle prime ouvert")}>+ Ajouter</button></div>
            <table>
              <tbody>
                <tr><th>Libellé</th><th>RTS</th><th>CNSS</th></tr>
                <tr><td>Prime d’ancienneté</td><td><span className="bg bg-v">Imposable</span></td><td><span className="bg bg-v">Soumise</span></td></tr>
                <tr><td>Prime de repas</td><td><span className="bg bg-v">Imposable</span></td><td><span className="bg bg-v">Soumise</span></td></tr>
                <tr><td>Indemnité de logement</td><td><span className="bg bg-b">Exonérée</span></td><td><span className="bg bg-b">Exonérée</span></td></tr>
                <tr><td>Indemnité de transport</td><td><span className="bg bg-b">Exonérée</span></td><td><span className="bg bg-b">Exonérée</span></td></tr>
                <tr><td>Indemnité cherté de vie</td><td><span className="bg bg-b">Exonérée</span></td><td><span className="bg bg-b">Exonérée</span></td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="hd"><h3>Types d’absences</h3></div>
            <table>
              <tbody>
                <tr><th>Type</th><th>Droit</th><th>Rémunéré</th></tr>
                <tr><td>Congé annuel</td><td>2,5 j ouvr./mois</td><td><span className="bg bg-v">Oui</span></td></tr>
                <tr><td>Congé maternité</td><td>98 j (14 sem.)</td><td><span className="bg bg-v">Oui</span></td></tr>
                <tr><td>Permission exceptionnelle</td><td>selon événement</td><td><span className="bg bg-v">Oui</span></td></tr>
                <tr><td>Absence non justifiée</td><td>—</td><td><span className="bg bg-r">Non — déduite</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pt6" && (
        <div className="panel">
          <div className="hd"><h3>Utilisateurs de l’espace</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mInviter")}>+ Inviter un utilisateur</button></div>
          <table>
            <tbody>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th>Statut</th><th></th></tr>
              <tr><td><div className="emp"><span className="av">MT</span><div><b>Michel TOLNO</b><small>m.tolno@garaya.gn</small></div></div></td><td><span className="bg bg-v">RH</span></td><td>Aujourd’hui, 09:12</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm">Gérer</button></td></tr>
              <tr><td><div className="emp"><span className="av g">DG</span><div><b>Ibrahima SOW</b><small>dg@garaya.gn</small></div></div></td><td><span className="bg bg-b">Direction</span></td><td>Hier, 18:40</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm">Gérer</button></td></tr>
              <tr><td><div className="emp"><span className="av g">GP</span><div><b>Gassim PLEGNEMOU</b><small>g.plegnemou@garaya.gn</small></div></div></td><td><span className="bg bg-o">Manager · DAF</span></td><td>Aujourd’hui, 08:02</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm">Gérer</button></td></tr>
              <tr><td><div className="emp"><span className="av g">AF</span><div><b>Aboubacar FAYE</b><small>faye.a@garaya.gn</small></div></div></td><td><span className="bg bg-g">Comptable</span></td><td>07/07, 16:55</td><td><span className="bg bg-v">Actif</span></td><td><button className="btn btn-g btn-sm">Gérer</button></td></tr>
              <tr><td><div className="emp"><span className="av g">?</span><div><b>c.bah@garaya.gn</b><small>invitation envoyée le 09/07</small></div></div></td><td><span className="bg bg-g">Employé</span></td><td>—</td><td><span className="bg bg-o">En attente</span></td><td><button className="btn btn-g btn-sm" onClick={() => toast("Invitation renvoyée à c.bah@garaya.gn")}>Renvoyer</button></td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
