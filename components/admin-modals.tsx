"use client";

import { Ovl } from "@/components/modals";
import { useModal, useToast } from "@/components/providers";

export function AdminModals() {
  const { om, cm } = useModal();
  const toast = useToast();

  return (
    <div className="adm">
      {/* ===== Suspendre ===== */}
      <Ovl id="mSuspendre">
        <div className="mdl sm">
          <div className="mh">
            <div className="ic-dgr">⏸</div>
            <div>
              <h3>Suspendre GARAYA HOLDING ?</h3>
              <p>L’espace passe en lecture seule pour tous ses utilisateurs.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fld"><label>Motif</label><select><option>Impayé persistant</option><option>Demande du client</option><option>Fraude suspectée</option><option>Autre</option></select></div>
            <div className="fld"><label>Message affiché au client</label><textarea rows={2} defaultValue="Votre espace est temporairement suspendu. Contactez support@nexsirh.gn." /></div>
            <div className="alert or"><span className="ic">ⓘ</span><div>Aucune donnée n’est supprimée. Les paies clôturées et bulletins restent téléchargeables par le client. Réactivation possible à tout moment.</div></div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-d" onClick={() => { cm(); toast("Entreprise suspendue ⏸ — action journalisée, client notifié"); }}>⏸ Suspendre</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Accès support (impersonation) ===== */}
      <Ovl id="mImpersonate">
        <div className="mdl sm">
          <div className="mh">
            <div className="ic-warn">🎧</div>
            <div>
              <h3>Accès support — GARAYA HOLDING</h3>
              <p>Ouvrir l’application comme si vous étiez l’admin du client.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="stat-line"><span>Consentement client</span><b><span className="bg bg-v">Accordé — ticket #248</span></b></div>
            <div className="stat-line"><span>Durée de la session</span><b>60 minutes max</b></div>
            <div className="stat-line"><span>Restrictions</span><b>Lecture seule sur salaires · aucune clôture de paie</b></div>
            <div className="fld" style={{ marginTop: 14 }}><label>Motif (journalisé)</label><input defaultValue="Diagnostic écart RTS — ticket #248" /></div>
            <div className="alert rg"><span className="ic">🛡</span><div>Session <b>entièrement enregistrée</b> dans l’audit et visible par le client dans son journal.</div></div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Session support ouverte 🎧 — bannière visible côté client, fin auto dans 60 min"); }}>Ouvrir la session</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Nouvelle version de barème ===== */}
      <Ovl id="mBareme">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>⚖ Nouvelle version du barème RTS</h3>
              <p>La version actuelle (v2026.1) reste appliquée aux paies antérieures à la date d’effet.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid" style={{ marginBottom: 14 }}>
              <div className="fld"><label>Référence</label><input className="mono" defaultValue="v2026.2" /></div>
              <div className="fld"><label>Date d’effet</label><input type="date" defaultValue="2026-09-01" /></div>
            </div>
            <table>
              <tbody>
                <tr><th>Tranche</th><th className="num">Plancher</th><th className="num">Plafond</th><th className="num">Taux</th></tr>
                {[["1", "0", "2 000 000", "5 %"], ["2", "2 000 000", "5 000 000", "8 %"], ["3", "5 000 000", "10 000 000", "10 %"], ["4", "10 000 000", "—", "15 %"]].map(([t, pl, pf, tx]) => (
                  <tr key={t}>
                    <td className="mono">{t}</td>
                    <td><input className="mono" defaultValue={pl} style={{ textAlign: "right" }} /></td>
                    <td><input className="mono" defaultValue={pf} style={{ textAlign: "right" }} /></td>
                    <td><input className="mono" defaultValue={tx} style={{ textAlign: "right", width: 80 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-o btn-sm" style={{ marginTop: 10 }} onClick={() => toast("Ligne de tranche ajoutée")}>+ Ajouter une tranche</button>
            <div className="alert or" style={{ marginTop: 12 }}>
              <span className="ic">🧪</span>
              <div><b>Contrôle obligatoire :</b> la publication lance les tests de non-régression sur les 8 bulletins de référence GARAYA. Publication bloquée si un écart est détecté.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-o" onClick={() => toast("Simulation lancée sur les 8 bulletins de référence… ✓ conforme au franc près")}>🧪 Simuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Barème v2026.2 publié ✓ — effet 01/09, 49 entreprises notifiées"); }}>Publier la version</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Modifier plan ===== */}
      <Ovl id="mPlanEdit">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>❤ Modifier le plan Business</h3>
              <p>Les 24 clients existants conservent leur tarif actuel.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Nom du plan</label><input defaultValue="Business" /></div>
              <div className="fld"><label>Prix mensuel (GNF)</label><input className="mono" defaultValue="950 000" /></div>
              <div className="fld"><label>Limite salariés</label><input className="mono" defaultValue="50" /></div>
              <div className="fld"><label>Limite utilisateurs</label><input defaultValue="Illimité" /></div>
              <div className="fld w">
                <label>Modules inclus</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                  <span className="bg bg-v">Personnel ✓</span><span className="bg bg-v">Paie ✓</span><span className="bg bg-v">Congés ✓</span><span className="bg bg-v">Temps ✓</span><span className="bg bg-v">Portail employé ✓</span>
                  <span className="bg bg-g" style={{ cursor: "pointer" }} onClick={() => toast("Module Rapports avancés ajouté au plan")}>+ Rapports avancés</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Plan Business mis à jour ❤ — applicable aux nouveaux abonnements"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Annonce ===== */}
      <Ovl id="mAnnonce">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>📣 Nouvelle annonce</h3>
              <p>Bannière in-app et/ou email vers les entreprises ciblées.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld w"><label>Titre</label><input defaultValue="🇬🇳 Le paiement Orange Money arrive en août !" /></div>
              <div className="fld"><label>Canal</label><select><option>Bannière + Email</option><option>Bannière in-app</option><option>Email uniquement</option></select></div>
              <div className="fld"><label>Cible</label><select><option>Toutes les entreprises (49)</option><option>Essais en cours (9)</option><option>Plan Business (24)</option><option>Impayées (2)</option></select></div>
              <div className="fld w"><label>Message</label><textarea rows={3} defaultValue="Dès le 1er août, réglez votre abonnement Nex'SIRH par Orange Money ou MTN MoMo, sans carte bancaire." /></div>
              <div className="fld"><label>Envoi</label><select><option>Immédiat</option><option>Programmé</option></select></div>
              <div className="fld"><label>Date programmée</label><input type="date" defaultValue="2026-07-20" /></div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-o" onClick={() => toast("Email de test envoyé à admin@nexsirh.gn ✓")}>✉ M’envoyer un test</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Annonce diffusée 📣 — 49 entreprises · bannière active + emails partis"); }}>Diffuser</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Ticket ===== */}
      <Ovl id="mTicket">
        <div className="mdl lg">
          <div className="mh">
            <div>
              <h3>🎧 Ticket #248 — Écart RTS sur bulletin</h3>
              <p>GARAYA HOLDING · ouvert il y a 3 h par m.tolno@garaya.gn · <span className="bg bg-r">Urgent</span></p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="alert or"><span className="ic">👤</span><div><b>Client — 09:41 :</b> « Le bulletin de M. Plegnemou affiche une RTS de 146 800 GNF mais notre ancien fichier Excel donnait 152 300. Pouvez-vous vérifier ? »</div></div>
            <div className="alert vt"><span className="ic">🎧</span><div><b>Aïssatou (support) — 10:15 :</b> « Vérification faite : l’écart vient d’une prime saisie comme imposable dans l’ancien fichier alors qu’elle est exonérée. Le calcul Nex’SIRH est conforme au barème v2026.1 (5/8/10/15 %). Détail joint. »</div></div>
            <div className="fld" style={{ marginTop: 12 }}>
              <label>Répondre</label>
              <textarea rows={3} placeholder="Votre réponse au client…" defaultValue="Bonjour M. Tolno, le détail tranche par tranche est joint. Le montant de 146 800 GNF est correct : …" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-o btn-sm" onClick={() => toast("Détail de calcul RTS joint au ticket 📎")}>📎 Joindre le détail de calcul</button>
              <button className="btn btn-o btn-sm" onClick={() => om("mImpersonate")}>🎧 Ouvrir un accès support</button>
              <button className="btn btn-o btn-sm" onClick={() => toast("Ticket réassigné à Mamadou K. (technique)")}>⇪ Réassigner</button>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-o" onClick={() => { cm(); toast("Réponse envoyée ✓ — ticket en attente client"); }}>Envoyer la réponse</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Ticket #248 résolu ✓ — enquête de satisfaction envoyée"); }}>✓ Résoudre</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Relance impayé ===== */}
      <Ovl id="mRelance">
        <div className="mdl sm">
          <div className="mh">
            <div className="ic-warn">💳</div>
            <div>
              <h3>Relancer INJELEC-GUINÉE</h3>
              <p>Facture de 950 000 GNF · 3 échecs carte · j.+12.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fld"><label>Action</label><select><option>Email de relance + nouveau lien de paiement</option><option>Retenter le prélèvement maintenant</option><option>Proposer le paiement par virement</option><option>Basculer en lecture seule (période de grâce finie)</option></select></div>
            <div className="stat-line"><span>Historique</span><b>Relances : 02/07 ✓ · 08/07 ✓</b></div>
            <div className="alert or" style={{ marginTop: 10 }}><span className="ic">ⓘ</span><div>Politique : lecture seule à j.+15, jamais de suppression de données. Suspension manuelle réservée au Super-admin.</div></div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Relance envoyée 💳 — lien de paiement valable 7 jours"); }}>Envoyer la relance</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Inviter membre équipe ===== */}
      <Ovl id="mInviterAdmin">
        <div className="mdl sm">
          <div className="mh">
            <div>
              <h3>Inviter un membre de l’équipe</h3>
              <p>2FA obligatoire à la première connexion.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fld"><label>Email @nexsirh.gn</label><input type="email" placeholder="prenom@nexsirh.gn" /></div>
            <div className="fld"><label>Rôle console</label><select><option>Support (lecture + accès support)</option><option>Technique (monitoring, migrations)</option><option>Commercial (clients, plans, promos)</option><option>Super-admin</option></select></div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Invitation envoyée ✓ — expire dans 48 h"); }}>Inviter</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Nouvelle entreprise ===== */}
      <Ovl id="mNouvelleEntreprise">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>🏢 Créer une entreprise manuellement</h3>
              <p>Pour un client migré depuis Excel ou signé hors ligne.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld w"><label>Raison sociale</label><input placeholder="Ex. : MINES BOKÉ SA" /></div>
              <div className="fld"><label>NIF</label><input className="mono" /></div>
              <div className="fld"><label>Email de l’admin client</label><input type="email" /></div>
              <div className="fld"><label>Plan</label><select><option>Essai 30 jours</option><option>Starter</option><option>Business</option><option>Cabinet</option></select></div>
              <div className="fld"><label>Facturation</label><select><option>Carte (lien Stripe)</option><option>Virement manuel</option><option>Offert (partenaire)</option></select></div>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", textTransform: "none", letterSpacing: 0, fontSize: 13, color: "var(--encre)", marginTop: 6 }}>
              <input type="checkbox" defaultChecked style={{ width: "auto" }} /> Envoyer l’invitation + le guide d’import Excel à l’admin
            </label>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Entreprise créée 🏢 — invitation admin envoyée ✓"); }}>Créer l’entreprise</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Mon profil & sécurité (super-admin) ===== */}
      <Ovl id="mProfilAdm">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>👤 Mon profil &amp; sécurité</h3>
              <p>Compte à privilèges élevés — chaque paramètre de sécurité compte.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fgrid">
              <div className="fld"><label>Nom affiché</label><input defaultValue="Super Admin" /></div>
              <div className="fld"><label>Email</label><input type="email" defaultValue="admin@nexsirh.gn" /></div>
              <div className="fld"><label>Rôle console</label><input defaultValue="Super-admin" disabled style={{ background: "#F3F1EA" }} /></div>
              <div className="fld"><label>Téléphone (alertes SMS)</label><input className="mono" defaultValue="+224 622 00 11 22" /></div>
            </div>
            <div className="tglrow" style={{ marginTop: 8 }}>
              <div><b>Authentification à deux facteurs</b><small>Obligatoire — ne peut pas être désactivée pour un super-admin.</small></div>
              <span className="bg bg-v">Activée ✓</span>
            </div>
            <div className="tglrow">
              <div><b>Codes de secours</b><small>8 codes à usage unique, à conserver hors ligne.</small></div>
              <button className="btn btn-o btn-sm" onClick={() => toast("8 nouveaux codes générés 🔑 — les anciens sont révoqués")}>Régénérer</button>
            </div>
            <div className="tglrow">
              <div><b>Alerte de connexion inhabituelle</b><small>Email + SMS si nouvelle IP ou nouvel appareil.</small></div>
              <span className="bg bg-v">Active ✓</span>
            </div>
            <div className="tglrow">
              <div><b>Sessions actives</b><small>1 session : ce navigateur (Conakry, 102.176.44.10).</small></div>
              <button className="btn btn-o btn-sm" onClick={() => toast("Toutes les autres sessions ont été révoquées 🛡")}>Tout révoquer</button>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Profil mis à jour ✓ — action journalisée"); }}>Enregistrer</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Modifier le mot de passe (super-admin) ===== */}
      <Ovl id="mMdpAdm">
        <div className="mdl sm">
          <div className="mh">
            <div>
              <h3>🔑 Modifier le mot de passe</h3>
              <p>Un code 2FA sera demandé pour confirmer.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="fld"><label>Mot de passe actuel</label><input type="password" placeholder="••••••••••••" /></div>
            <div className="fld"><label>Nouveau mot de passe</label><input type="password" placeholder="12 caractères min. pour un super-admin" /></div>
            <div className="fld"><label>Confirmation</label><input type="password" placeholder="••••••••••••" /></div>
            <div className="fld"><label>Code 2FA</label><input className="mono" placeholder="000 000" style={{ letterSpacing: ".3em", textAlign: "center" }} /></div>
            <div className="alert or">
              <span className="ic">🛡</span>
              <div>Toutes les sessions console seront déconnectées et l’équipe sera notifiée du changement.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Mot de passe modifié ✓ — sessions révoquées, équipe notifiée 🛡"); }}>Modifier</button>
          </div>
        </div>
      </Ovl>
    </div>
  );
}
