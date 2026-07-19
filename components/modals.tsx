"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";

/**
 * Identifiants de modales globales. Les anciennes modales STATIQUES
 * (aperçu bulletin, clôture, congés, journal…) ont été remplacées par des
 * implémentations réelles locales aux pages — l'union est conservée pour
 * les identifiants encore actifs.
 */
export type ModalId =
  | "mNouvelEmploye"   // assistant réel : components/nouvel-employe.tsx
  | "mInviter"
  | "mPlan"
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
  const { cm } = useModal();
  const toast = useToast();

  return (
    <>
      {/* ===== Inviter un utilisateur (rendue réelle au Lot 4) ===== */}
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
              <div className="fld w"><label>Adresse email</label><input type="email" placeholder="prenom.nom@entreprise.gn" /></div>
              <div className="fld"><label>Rôle</label><select><option>Employé (portail)</option><option>Manager</option><option>RH</option><option>Comptable</option><option>Direction (lecture)</option><option>Administrateur</option></select></div>
            </div>
            <div className="alert vt">
              <span className="ic">💡</span>
              <div><b>Rappel des droits :</b> un Manager ne voit que son équipe et jamais les salaires ; un Employé ne voit que ses propres bulletins et congés.</div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Annuler</button>
            <button className="btn btn-p" onClick={() => { cm(); toast("Invitation réelle : voir Paramétrage → Utilisateurs"); }}>Envoyer l’invitation</button>
          </div>
        </div>
      </Ovl>

      {/* ===== Changement de plan (Stripe = étape V) ===== */}
      <Ovl id="mPlan">
        <div className="mdl sm">
          <div className="mh">
            <div>
              <h3>Changer de plan</h3>
              <p>Le paiement en ligne (Stripe / Orange Money) arrive à l’étape V.</p>
            </div>
            <button className="x" onClick={cm}>✕</button>
          </div>
          <div className="mb">
            <div className="alert or"><span className="ic">ⓘ</span><div>En attendant l’activation du paiement en ligne, contactez <b>support@nexsirh.gn</b> pour changer de plan (activation manuelle par la plateforme).</div></div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={cm}>Fermer</button>
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
            <div className="fgrid">
              <div className="fld"><label>Prénom</label><input defaultValue="" placeholder="Prénom" /></div>
              <div className="fld"><label>Nom</label><input defaultValue="" placeholder="Nom" /></div>
              <div className="fld"><label>Téléphone</label><input className="mono" /></div>
              <div className="fld"><label>Langue</label><select><option>Français</option></select></div>
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
              <div className="fld"><label>Téléphone</label><input className="mono" /></div>
              <div className="fld"><label>Email personnel</label><input type="email" /></div>
              <div className="fld w"><label>Adresse</label><input /></div>
              <div className="fld"><label>Contact d’urgence</label><input /></div>
              <div className="fld"><label>Téléphone d’urgence</label><input className="mono" /></div>
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

      {/* ===== Modifier le mot de passe ===== */}
      <ModaleMotDePasse />

      {/* ===== Préférences de notifications ===== */}
      <Ovl id="mNotifs">
        <div className="mdl">
          <div className="mh">
            <div>
              <h3>🔔 Préférences de notifications</h3>
              <p>Choisissez les emails que vous souhaitez recevoir (envois réels : étape X).</p>
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

/** Changement de mot de passe RÉEL (Supabase Auth) — utilisateur connecté. */
function ModaleMotDePasse() {
  const { open, cm } = useModal();
  const toast = useToast();
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (open !== "mMdp") return null;

  async function changer() {
    if (nouveau.length < 8) { setErreur("8 caractères minimum."); return; }
    if (nouveau !== confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }
    setPending(true);
    setErreur(null);
    const { createClient } = await import("@/lib/supabase/client");
    const { error } = await createClient().auth.updateUser({ password: nouveau });
    setPending(false);
    if (error) { setErreur(error.message); return; }
    setNouveau("");
    setConfirmation("");
    cm();
    toast("Mot de passe modifié ✓ — effectif immédiatement");
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && cm()}>
      <div className="mdl sm">
        <div className="mh">
          <div>
            <h3>🔑 Modifier le mot de passe</h3>
            <p>Vous resterez connecté(e) sur cet appareil.</p>
          </div>
          <button className="x" onClick={cm}>✕</button>
        </div>
        <div className="mb">
          <div className="fld">
            <label>Nouveau mot de passe</label>
            <input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="8 caractères min." />
          </div>
          <div className="fld">
            <label>Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
          {erreur && <div className="alert rg"><span className="ic">⚠</span><div>{erreur}</div></div>}
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={cm}>Annuler</button>
          <button className="btn btn-p" disabled={pending || !nouveau} onClick={changer}>
            {pending ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </div>
      </div>
    </div>
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
