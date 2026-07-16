"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

export type ModalId =
  | "mNouvelEmploye"
  | "mBulletin"
  | "mCloture"
  | "mRecalcul"
  | "mDemandeConge"
  | "mValiderConge"
  | "mGenererDoc"
  | "mInviter"
  | "mMouvement"
  | "mPlan"
  | "mDocsAdmin"
  | "mJournal"
  | "mModifEmploye"
  // Menu profil — app & portail
  | "mProfil"
  | "mProfilEmp"
  | "mMdp"
  | "mNotifs"
  // Console admin
  | "mSuspendre"
  | "mImpersonate"
  | "mBareme"
  | "mPlanEdit"
  | "mAnnonce"
  | "mTicket"
  | "mRelance"
  | "mInviterAdmin"
  | "mNouvelleEntreprise"
  // Menu profil — console admin
  | "mProfilAdm"
  | "mMdpAdm";

export function Ovl({ id, children }: { id: ModalId; children: React.ReactNode }) {
  const { open, cm } = useModal();
  if (open !== id) return null;
  return (
    <div
      className="ovl"
      onClick={(e) => {
        if (e.target === e.currentTarget) cm();
      }}
    >
      {children}
    </div>
  );
}

export function Modals() {
  const { om, cm } = useModal();
  const toast = useToast();

  return (
    <>
      {/* ===== Nouvel employé (assistant multi-étapes) ===== */}
      <Ovl id="mNouvelEmploye">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>Nouvel employé</h3>
              <p>
                Étape 1 sur 6 — Identité · le matricule <b className="mono">EMP-025</b> sera
                attribué automatiquement.
              </p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="steps">
              <span className="on" /><span /><span /><span /><span /><span />
            </div>
            <div className="fgrid">
              <div className="fld"><label>Civilité</label><select><option>M.</option><option>Mme</option><option>Mlle</option></select></div>
              <div className="fld"><label>Nationalité</label><input defaultValue="Guinéenne" /></div>
              <div className="fld"><label>Nom *</label><input placeholder="EN MAJUSCULES" /></div>
              <div className="fld"><label>Prénom *</label><input placeholder="Première lettre majuscule" /></div>
              <div className="fld"><label>Date de naissance *</label><input type="date" defaultValue="1995-04-12" /></div>
              <div className="fld"><label>Lieu de naissance</label><input placeholder="Ville" /></div>
              <div className="fld"><label>Situation matrimoniale</label><select><option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf(ve)</option></select></div>
              <div className="fld"><label>Enfants à charge</label><input type="number" defaultValue={0} /></div>
            </div>
            <div className="alert or" style={{ marginTop: 6 }}>
              <span className="ic">ⓘ</span>
              <div>Contrôle automatique : l’âge doit être <b>≥ 16 ans</b> (Code du travail guinéen). Un CDD ne pourra pas dépasser <b>24 mois</b>.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-o" disabled style={{ opacity: 0.45 }}>← Précédent</button>
            <button className="btn btn-p" onClick={() => toast("Étape 2 — Coordonnées")}>Suivant : Coordonnées →</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Aperçu du bulletin ===== */}
      <Ovl id="mBulletin">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>Bulletin de paie — Aperçu</h3>
              <p>FAYE Aboubacar · Juin 2026 · période du 01/06 au 30/06</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb bltn">
            <div className="bh">
              <div>
                <h4>GARAYA HOLDING</h4>
                <small>Kipé, Ratoma, Conakry · NIF 375106275<br />Convention Collective du Travail</small>
              </div>
              <div style={{ textAlign: "right" }}>
                <b>FAYE Aboubacar</b><br />
                <small>Comptable · DAF · Mat. <span className="mono">EMP-002</span><br />N° CNSS <span className="mono">11905 1224</span> · Ancienneté 10 ans 1 mois</small>
              </div>
            </div>
            <table>
              <tbody>
                <tr><th>Désignation</th><th className="num">Base</th><th className="num">Taux sal.</th><th className="num">Gain</th><th className="num">Retenue sal.</th><th className="num">Part patronale</th></tr>
                <tr><td>Salaire de base</td><td className="gnf">173,33 h</td><td className="gnf"></td><td className="gnf">3 000 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr><td>Prime d’ancienneté</td><td className="gnf"></td><td className="gnf"></td><td className="gnf">120 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr><td>Prime de repas</td><td className="gnf"></td><td className="gnf"></td><td className="gnf">150 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr><td>Indemnité de logement</td><td className="gnf"></td><td className="gnf"></td><td className="gnf">150 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr><td>Indemnité de transport</td><td className="gnf"></td><td className="gnf"></td><td className="gnf">225 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr><td>Indemnité de cherté de vie</td><td className="gnf"></td><td className="gnf"></td><td className="gnf">100 000</td><td className="gnf"></td><td className="gnf"></td></tr>
                <tr className="tot"><td><b>Total brut</b></td><td></td><td></td><td className="gnf"><b>3 745 000</b></td><td></td><td></td></tr>
                <tr><td>Cotisation CNSS</td><td className="gnf">2 500 000</td><td className="gnf">5 %</td><td className="gnf"></td><td className="gnf">125 000</td><td className="gnf">450 000 <small>(18 %)</small></td></tr>
                <tr><td>RTS (barème progressif)</td><td className="gnf">1 995 000</td><td className="gnf">5 %</td><td className="gnf"></td><td className="gnf">99 750</td><td className="gnf"></td></tr>
                <tr><td>Versement forfaitaire</td><td className="gnf">3 595 000</td><td className="gnf"></td><td className="gnf"></td><td className="gnf"></td><td className="gnf">215 700 <small>(6 %)</small></td></tr>
                <tr><td>CFPA</td><td className="gnf">3 745 000</td><td className="gnf"></td><td className="gnf"></td><td className="gnf"></td><td className="gnf">56 175 <small>(1,5 %)</small></td></tr>
                <tr className="tot"><td><b>Total cotisations</b></td><td></td><td></td><td></td><td className="gnf"><b>224 750</b></td><td className="gnf"><b>721 875</b></td></tr>
                <tr><td>Prêt personnel <small>(mensualité 8/24)</small></td><td className="gnf"></td><td className="gnf"></td><td className="gnf"></td><td className="gnf">2 016 982</td><td className="gnf"></td></tr>
                <tr className="net"><td><b>NET À PAYER — virement du 30/06/2026</b></td><td></td><td></td><td></td><td></td><td className="gnf" style={{ textAlign: "right" }}><b>1 503 268 GNF</b></td></tr>
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 10 }}>
              Cumuls annuels — Brut : <span className="mono">22 470 000</span> · CNSS sal. : <span className="mono">750 000</span> · RTS : <span className="mono">598 500</span> · Net perçu : <span className="mono">15 546 268</span> — Conservez ce bulletin sans limitation de durée.
            </p>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-o" onClick={() => toast("Bulletin envoyé par email au salarié ✓")}>✉ Envoyer au salarié</button>
            <button className="btn btn-p" onClick={() => toast("Téléchargement du PDF…")}>⇩ Télécharger le PDF</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Clôture de la paie ===== */}
      <Ovl id="mCloture">
        <div className="mdl sm">
          <div className="mh">
            <div className="ic-warn">🔒</div>
            <div>
              <h3>Clôturer la paie de juillet 2026 ?</h3>
              <p>Cette action est définitive.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="stat-line"><span>Bulletins concernés</span><b className="mono">24</b></div>
            <div className="stat-line"><span>Net total à virer</span><b className="gnf">72 278 288 GNF</b></div>
            <div className="alert or" style={{ marginTop: 14 }}>
              <span className="ic">⚠</span>
              <div>Après clôture : montants <b>figés et archivés</b>, aucun recalcul ni suppression possible. Toute correction passera par une <b>régularisation sur le mois suivant</b>.</div>
            </div>
            <div className="fld" style={{ marginTop: 14 }}>
              <label>Tapez « CLOTURER » pour confirmer</label>
              <input placeholder="CLOTURER" className="mono" />
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-or" onClick={() => { cm(); toast("Paie de juillet 2026 clôturée — 24 bulletins archivés 🔒"); }}>🔒 Clôturer définitivement</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Recalcul ===== */}
      <Ovl id="mRecalcul">
        <div className="mdl sm">
          <div className="mh">
            <div className="ic-warn">↻</div>
            <div>
              <h3>Recalculer les 24 bulletins ?</h3>
              <p>Période en brouillon — recalcul autorisé.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <p style={{ fontSize: 13.5 }}>
              Les bulletins seront régénérés à partir des fiches salariés, feuilles de temps validées et barèmes en vigueur. Les saisies manuelles (avances, autres retenues) sont <b>conservées</b>.
            </p>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Recalcul terminé — 24 bulletins mis à jour, 0 anomalie"); }}>↻ Lancer le recalcul</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Demande de congé ===== */}
      <Ovl id="mDemandeConge">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>Nouvelle demande de congé</h3>
              <p>Le nombre de jours ouvrables est calculé automatiquement (week-ends et fériés exclus).</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld w"><label>Salarié</label><select><option>CAMARA Bountouraby — Formatrice (solde : 12,5 j)</option><option>FAYE Aboubacar — Comptable (solde : 11,5 j)</option></select></div>
              <div className="fld"><label>Type d’absence</label><select><option>Congé annuel</option><option>Congé maladie</option><option>Congé maternité</option><option>Permission exceptionnelle</option><option>Absence non justifiée</option></select></div>
              <div className="fld"><label>Justificatif (optionnel)</label><input type="file" /></div>
              <div className="fld"><label>Du</label><input type="date" defaultValue="2026-08-04" /></div>
              <div className="fld"><label>Au (inclus)</label><input type="date" defaultValue="2026-08-15" /></div>
              <div className="fld w"><label>Commentaire</label><textarea rows={2} placeholder="Motif ou précision…" /></div>
            </div>
            <div className="alert vt">
              <span className="ic">🧮</span>
              <div><b>9 jours ouvrables</b> décomptés (2 week-ends exclus). Solde après congé : <b className="mono">3,5 j</b>. Circuit : Manager (M. Tolno) → RH.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Demande envoyée — notification au manager ✓"); }}>Envoyer la demande</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Validation de congé ===== */}
      <Ovl id="mValiderConge">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>Traiter la demande de congé</h3>
              <p>CAMARA Bountouraby · Congé annuel · 04 – 15 août (9 j ouvrables)</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="stat-line"><span>Validation manager</span><b><span className="bg bg-v">Approuvée — M. Barry, 09/07</span></b></div>
            <div className="stat-line"><span>Solde actuel / après congé</span><b className="mono">12,5 j → 3,5 j</b></div>
            <div className="stat-line"><span>Chevauchement d’équipe</span><b><span className="bg bg-o">1 autre absence D.R.H du 04 au 07/08</span></b></div>
            <div className="fld" style={{ marginTop: 16 }}>
              <label>Motif (obligatoire en cas de refus)</label>
              <textarea rows={2} placeholder="Ex. : effectif insuffisant sur la période…" />
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-d" onClick={() => { cm(); toast("Demande refusée — salarié et manager notifiés"); }}>Refuser</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Congé approuvé ✓ — solde mis à jour : 3,5 j"); }}>✓ Approuver (validation RH)</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Générer un document ===== */}
      <Ovl id="mGenererDoc">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>Générer un document officiel</h3>
              <p>Le PDF est pré-rempli avec les données du salarié et archivé automatiquement.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Type de document</label><select><option>Attestation de travail</option><option>Certificat de travail</option><option>Certificat de congé</option><option>Solde de tout compte</option><option>Contrat de travail (CDI/CDD)</option></select></div>
              <div className="fld"><label>Salarié</label><select><option>FAYE Aboubacar — EMP-002</option><option>TOLNO Michel — EMP-004</option><option>CAMARA Bountouraby — EMP-007</option></select></div>
              <div className="fld"><label>Signataire</label><select><option>M. Ibrahima SOW — Directeur Général</option><option>M. Michel TOLNO — D.R.H</option></select></div>
              <div className="fld"><label>Langue</label><select><option>Français</option></select></div>
              <div className="fld w"><label>Mention particulière (optionnel)</label><input placeholder="Ex. : document destiné à la BIG pour dossier de crédit" /></div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-o" onClick={() => toast("Aperçu du document ouvert")}>👁 Aperçu</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Attestation générée et archivée 📄"); }}>Générer le PDF</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Inviter un utilisateur ===== */}
      <Ovl id="mInviter">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>Inviter un utilisateur</h3>
              <p>Il recevra un email pour créer son mot de passe.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld w"><label>Adresse email</label><input type="email" placeholder="prenom.nom@garaya.gn" /></div>
              <div className="fld"><label>Rôle</label><select><option>Employé (portail)</option><option>Manager</option><option>RH</option><option>Comptable</option><option>Direction (lecture)</option><option>Administrateur</option></select></div>
              <div className="fld"><label>Lier à la fiche salarié</label><select><option>— Aucune —</option><option>BAH Cellou — EMP-011</option></select></div>
            </div>
            <div className="alert vt">
              <span className="ic">💡</span>
              <div><b>Rappel des droits :</b> un Manager ne voit que son équipe et jamais les salaires ; un Employé ne voit que ses propres bulletins et congés.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Invitation envoyée ✓"); }}>Envoyer l’invitation</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Nouveau mouvement ===== */}
      <Ovl id="mMouvement">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>Nouveau mouvement de carrière</h3>
              <p>FAYE Aboubacar — tracé dans l’historique d’audit.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Type de mouvement</label><select><option>Augmentation de salaire</option><option>Promotion / changement de poste</option><option>Mutation de département</option><option>Suspension</option><option>Départ (démission, licenciement, fin CDD…)</option></select></div>
              <div className="fld"><label>Date d’effet</label><input type="date" defaultValue="2026-08-01" /></div>
              <div className="fld"><label>Salaire actuel</label><input className="mono" defaultValue="3 000 000 GNF" disabled style={{ background: "var(--menthe2)" }} /></div>
              <div className="fld"><label>Nouveau salaire de base</label><input className="mono" placeholder="3 200 000" /></div>
              <div className="fld w"><label>Motif</label><textarea rows={2} placeholder="Ex. : révision annuelle, résultats 2025…" /></div>
            </div>
            <div className="alert or">
              <span className="ic">ⓘ</span>
              <div>Le nouveau salaire s’appliquera à partir de la <b>paie d’août 2026</b>. La paie de juillet (brouillon) n’est pas modifiée.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Mouvement enregistré — historique mis à jour"); }}>Enregistrer le mouvement</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Changement de plan ===== */}
      <Ovl id="mPlan">
        <div className="mdl sm">
          <div className="mh">
            <div>
              <h3>Passer au plan Business</h3>
              <p>950 000 GNF / mois · jusqu’à 50 salariés</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="stat-line"><span>Facturation</span><b>Mensuelle, sans engagement</b></div>
            <div className="stat-line"><span>Premier prélèvement</span><b>24/07/2026 (fin d’essai)</b></div>
            <div className="fld" style={{ marginTop: 14 }}>
              <label>Moyen de paiement</label>
              <select><option>💳 Carte bancaire (Visa / Mastercard)</option><option>📱 Orange Money — bientôt disponible</option><option>📱 MTN MoMo — bientôt disponible</option><option>🏦 Virement bancaire (activation manuelle)</option></select>
            </div>
            <div className="fld"><label>Numéro de carte</label><input className="mono" placeholder="4242 4242 4242 4242" /></div>
            <div className="fgrid">
              <div className="fld"><label>Expiration</label><input className="mono" placeholder="MM/AA" /></div>
              <div className="fld"><label>CVC</label><input className="mono" placeholder="•••" /></div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Abonnement Business activé 🎉 — facture disponible"); }}>Confirmer l’abonnement</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Documents administratifs ===== */}
      <Ovl id="mDocsAdmin">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>📑 Documents administratifs</h3>
              <p>Génération des documents légaux et internes pour une période donnée.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid" style={{ marginBottom: 16 }}>
              <div className="fld"><label>Mois</label><select defaultValue="Mai"><option>Janvier</option><option>Février</option><option>Mars</option><option>Avril</option><option>Mai</option><option>Juin</option><option>Juillet</option></select></div>
              <div className="fld"><label>Année</label><select defaultValue="2026"><option>2026</option><option>2025</option></select></div>
            </div>

            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="hd" style={{ padding: "11px 16px" }}><h3 style={{ fontSize: 13.5, color: "var(--vert)" }}>Documents CNSS &amp; Inspection du Travail</h3></div>
              <div className="bd" style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
                <label style={chk}><input type="checkbox" defaultChecked style={{ width: "auto" }} /> Registre du personnel <span className="bg bg-g">Inspection du Travail / CNSS</span></label>
                <label style={chk}><input type="checkbox" style={{ width: "auto" }} /> Déclaration CNSS mensuelle <span className="bg bg-g">cotisations 5 % + 18 %</span></label>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="hd" style={{ padding: "11px 16px" }}><h3 style={{ fontSize: 13.5, color: "#8E3325" }}>Documents Impôts (DNI)</h3></div>
              <div className="bd" style={{ padding: "12px 16px" }}>
                <label style={chk}><input type="checkbox" defaultChecked style={{ width: "auto" }} /> État RTS mensuel — Retenue sur les Traitements et Salaires <span className="bg bg-o">format eTax</span></label>
              </div>
            </div>

            <div className="panel">
              <div className="hd" style={{ padding: "11px 16px" }}><h3 style={{ fontSize: 13.5, color: "var(--bleu)" }}>Documents internes</h3></div>
              <div className="bd" style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
                <label style={chk}><input type="checkbox" defaultChecked style={{ width: "auto" }} /> État des salaires <span className="bg bg-g">récapitulatif paie mensuel</span></label>
                <label style={chk}><input type="checkbox" style={{ width: "auto" }} /> Suivi des congés <span className="bg bg-g">soldes &amp; absences de la période</span></label>
                <label style={chk}><input type="checkbox" style={{ width: "auto" }} /> Fiche individuelle</label>
                <div style={{ paddingLeft: 26, maxWidth: 340 }}>
                  <select><option>— Sélectionner un employé —</option><option>FAYE Aboubacar — EMP-002</option><option>TOLNO Michel — EMP-004</option><option>TRAORE Aminata — EMP-005</option><option>CAMARA Bountouraby — EMP-007</option></select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <button className="btn btn-o btn-sm" onClick={() => toast("Tout sélectionné")}>Tout sélectionner</button>
              <button className="btn btn-o btn-sm" onClick={() => toast("Tout désélectionné")}>Tout désélectionner</button>
              <span className="note" style={{ marginLeft: "auto" }}>Les PDF générés sont archivés dans « Documents »</span>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-o" onClick={() => toast("Dossier des documents générés ouvert 📁")}>📁 Ouvrir le dossier</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("3 documents générés pour Mai 2026 📑 — archivés dans Documents"); }}>Générer les documents</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Journal de paie ===== */}
      <Ovl id="mJournal">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>📒 Journal de paie — Juillet 2026</h3>
              <p>Document obligatoire (inspection du travail) · une ligne par salarié · 24 salariés.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <table>
              <tbody>
                <tr><th>Matricule</th><th>Salarié</th><th className="num">Brut</th><th className="num">CNSS sal.</th><th className="num">RTS</th><th className="num">CNSS pat.</th><th className="num">VF + CFPA</th><th className="num">Net à payer</th></tr>
                <tr><td className="mono">EMP-002</td><td><b>FAYE Aboubacar</b></td><td className="gnf">3 745 000</td><td className="gnf">125 000</td><td className="gnf">99 750</td><td className="gnf">450 000</td><td className="gnf">271 875</td><td className="gnf"><b>1 503 268</b></td></tr>
                <tr><td className="mono">EMP-004</td><td><b>TOLNO Michel</b></td><td className="gnf">3 355 000</td><td className="gnf">125 000</td><td className="gnf">81 000</td><td className="gnf">450 000</td><td className="gnf">242 625</td><td className="gnf"><b>3 149 000</b></td></tr>
                <tr><td className="mono">EMP-005</td><td><b>TRAORE Aminata</b></td><td className="gnf">2 745 000</td><td className="gnf">125 000</td><td className="gnf">50 500</td><td className="gnf">450 000</td><td className="gnf">196 875</td><td className="gnf"><b>2 569 500</b></td></tr>
                <tr><td className="mono">EMP-006</td><td><b>SYLLA Aboubacar</b></td><td className="gnf">2 215 000</td><td className="gnf">110 750</td><td className="gnf">29 463</td><td className="gnf">398 700</td><td className="gnf">158 151</td><td className="gnf"><b>2 074 788</b></td></tr>
                <tr><td className="mono">EMP-007</td><td><b>CAMARA Bountouraby</b></td><td className="gnf">2 389 000</td><td className="gnf">119 450</td><td className="gnf">35 778</td><td className="gnf">430 020</td><td className="gnf">170 575</td><td className="gnf"><b>2 233 773</b></td></tr>
                <tr><td className="mono">EMP-009</td><td><b>PLEGNEMOU Gassim</b></td><td className="gnf">4 480 000</td><td className="gnf">125 000</td><td className="gnf">146 800</td><td className="gnf">450 000</td><td className="gnf">327 000</td><td className="gnf"><b>4 208 200</b></td></tr>
                <tr style={{ borderTop: "2px solid var(--encre)" }}><td colSpan={2} style={{ fontWeight: 700 }}>TOTAUX (24 salariés)</td><td className="gnf"><b>79 214 000</b></td><td className="gnf"><b>3 673 000</b></td><td className="gnf"><b>1 245 730</b></td><td className="gnf"><b>13 218 400</b></td><td className="gnf"><b>2 654 010</b></td><td className="gnf" style={{ color: "var(--vert)" }}><b>72 278 288</b></td></tr>
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 10 }}>Aperçu partiel — le PDF complet contient les 24 lignes, les cumuls annuels et la signature de l’employeur.</p>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-o" onClick={() => toast("Export Excel du journal généré ⇩")}>⇩ Excel</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Journal de paie PDF généré et archivé 📒"); }}>⇩ Télécharger le PDF</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Modifier employé ===== */}
      <Ovl id="mModifEmploye">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>✎ Modifier la fiche — FAYE Aboubacar</h3>
              <p>Matricule <b className="mono">EMP-002</b> (non modifiable) · toute modification est tracée dans l’historique.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Civilité</label><select defaultValue="M."><option>M.</option><option>Mme</option><option>Mlle</option></select></div>
              <div className="fld"><label>Situation matrimoniale</label><select defaultValue="Marié(e)"><option>Marié(e)</option><option>Célibataire</option></select></div>
              <div className="fld"><label>Nom</label><input defaultValue="FAYE" /></div>
              <div className="fld"><label>Prénom</label><input defaultValue="Aboubacar" /></div>
              <div className="fld"><label>Téléphone</label><input className="mono" defaultValue="628 44 12 09" /></div>
              <div className="fld"><label>Email</label><input defaultValue="faye.a@garaya.gn" /></div>
              <div className="fld w"><label>Adresse</label><input defaultValue="Hafia, Commune de Ratoma, Conakry" /></div>
              <div className="fld"><label>Poste</label><select defaultValue="Comptable"><option>Comptable</option><option>Aide-comptable</option><option>R.A.F</option></select></div>
              <div className="fld"><label>Département</label><select defaultValue="DAF"><option>DAF</option><option>D.R.H</option><option>Conformité</option></select></div>
              <div className="fld"><label>Supérieur hiérarchique</label><select><option>PLEGNEMOU Gassim — R.A.F</option></select></div>
              <div className="fld"><label>Mode de paiement</label><select defaultValue="Virement"><option>Virement</option><option>Espèces</option><option>Chèque</option></select></div>
            </div>
            <div className="alert or" style={{ marginTop: 8 }}>
              <span className="ic">🔒</span>
              <div>Le <b>salaire de base et les primes</b> ne se modifient pas ici : utilisez « Nouveau mouvement » pour garder la traçabilité (ancienne/nouvelle valeur, motif, date d’effet).</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-o" onClick={() => om("mMouvement")}>✎ Modifier le salaire (mouvement)</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Fiche mise à jour ✓ — modification tracée dans l’historique"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Mon profil (utilisateur app) ===== */}
      <Ovl id="mProfil">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>👤 Mon profil</h3>
              <p>Vos informations de compte. Les données RH (salaire, contrat) se gèrent sur votre fiche employé.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
              <span className="av" style={{ width: 64, height: 64, fontSize: 22 }}>MT</span>
              <div>
                <button className="btn btn-o btn-sm" onClick={() => toast("Nouvelle photo de profil enregistrée 📷")}>📷 Changer la photo</button>
                <p className="note" style={{ marginTop: 6 }}>JPG ou PNG, 2 Mo max.</p>
              </div>
            </div>
            <div className="fgrid">
              <div className="fld"><label>Prénom</label><input defaultValue="Michel" /></div>
              <div className="fld"><label>Nom</label><input defaultValue="TOLNO" /></div>
              <div className="fld"><label>Email de connexion</label><input type="email" defaultValue="m.tolno@garaya.gn" /></div>
              <div className="fld"><label>Téléphone</label><input className="mono" defaultValue="622 18 40 27" /></div>
              <div className="fld"><label>Rôle</label><input defaultValue="RH (administrateur)" disabled style={{ background: "var(--menthe2)" }} /></div>
              <div className="fld"><label>Fiche employé liée</label><input defaultValue="TOLNO Michel — EMP-004" disabled style={{ background: "var(--menthe2)" }} /></div>
              <div className="fld"><label>Langue</label><select><option>Français</option></select></div>
              <div className="fld"><label>Fuseau horaire</label><select><option>GMT — Conakry</option></select></div>
            </div>
            <div className="tglrow" style={{ marginTop: 6 }}>
              <div><b>Authentification à deux facteurs (2FA)</b><small>Fortement recommandée pour les rôles RH et Admin.</small></div>
              <button className="btn btn-o btn-sm" onClick={() => toast("Assistant 2FA ouvert — scannez le QR code avec votre application 📱")}>Activer</button>
            </div>
            <div className="alert or" style={{ marginTop: 10 }}>
              <span className="ic">ⓘ</span>
              <div>La modification de l’email de connexion nécessitera une confirmation envoyée à l’ancienne et à la nouvelle adresse.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Profil mis à jour ✓"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Mon profil (employé portail) ===== */}
      <Ovl id="mProfilEmp">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>👤 Mon profil</h3>
              <p>Vous pouvez mettre à jour vos coordonnées. Les autres informations sont gérées par le service RH.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Nom complet</label><input defaultValue="CAMARA Bountouraby" disabled style={{ background: "var(--menthe2)" }} /></div>
              <div className="fld"><label>Poste</label><input defaultValue="Formatrice — D.R.H" disabled style={{ background: "var(--menthe2)" }} /></div>
              <div className="fld"><label>Téléphone</label><input className="mono" defaultValue="628 77 45 12" /></div>
              <div className="fld"><label>Email personnel</label><input type="email" defaultValue="b.camara@garaya.gn" /></div>
              <div className="fld w"><label>Adresse</label><input defaultValue="Koloma, Commune de Ratoma, Conakry" /></div>
              <div className="fld"><label>Contact d’urgence</label><input defaultValue="CAMARA Sékou (frère)" /></div>
              <div className="fld"><label>Téléphone d’urgence</label><input className="mono" defaultValue="655 09 31 20" /></div>
            </div>
            <div className="alert vt">
              <span className="ic">✓</span>
              <div>Toute modification est <b>notifiée au service RH</b> et tracée dans votre dossier.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Coordonnées mises à jour ✓ — le service RH est notifié"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Modifier le mot de passe (app/portail) ===== */}
      <Ovl id="mMdp">
        <div className="mdl sm">
          <div className="mh">
            <div>
              <h3>🔑 Modifier le mot de passe</h3>
              <p>Vous resterez connecté(e) sur cet appareil.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fld"><label>Mot de passe actuel</label><input type="password" placeholder="••••••••" /></div>
            <div className="fld">
              <label>Nouveau mot de passe</label>
              <input type="password" placeholder="8 caractères min., 1 chiffre, 1 majuscule" />
              <div className="pwd-meter"><i className="ok" /><i className="ok" /><i className="ok" /><i /></div>
              <p className="note" style={{ marginTop: 4 }}>Robustesse : <b style={{ color: "var(--vert)" }}>bonne</b></p>
            </div>
            <div className="fld"><label>Confirmer le nouveau mot de passe</label><input type="password" placeholder="••••••••" /></div>
            <div className="alert or">
              <span className="ic">🛡</span>
              <div>Toutes les <b>autres sessions</b> (téléphone, autre navigateur) seront déconnectées par sécurité.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Mot de passe modifié ✓ — les autres sessions ont été déconnectées 🛡"); }}>Modifier le mot de passe</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Préférences de notifications ===== */}
      <Ovl id="mNotifs">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>🔔 Préférences de notifications</h3>
              <p>Choisissez les emails que vous souhaitez recevoir.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <ToggleRow title="Demande de congé à valider" desc="Quand un collaborateur soumet une demande qui vous concerne." defaultOn />
            <ToggleRow title="Décision sur mes demandes" desc="Approbation ou refus de vos propres demandes." defaultOn />
            <ToggleRow title="Bulletin de paie disponible" desc="Chaque mois, dès la clôture de la paie." defaultOn />
            <ToggleRow title="Alertes RH hebdomadaires" desc="CDD à échéance, pièces expirant, fins de période d’essai (rôles RH/Manager)." defaultOn />
            <ToggleRow title="Nouveautés produit" desc="Annonces Nex’SIRH (1 à 2 par mois maximum)." />
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Préférences enregistrées ✓"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>
    </>
  );
}

function ToggleRow({ title, desc, defaultOn }: { title: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="tglrow">
      <div><b>{title}</b><small>{desc}</small></div>
      <button className={`tgl${on ? " on" : ""}`} onClick={() => setOn((v) => !v)} aria-pressed={on} />
    </div>
  );
}

const chk: React.CSSProperties = {
  display: "flex",
  gap: 9,
  alignItems: "center",
  textTransform: "none",
  letterSpacing: 0,
  fontSize: 13.5,
  fontWeight: 500,
  color: "var(--encre)",
  margin: 0,
};
