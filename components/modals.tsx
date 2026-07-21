"use client";

import { useState, useEffect } from "react";
import { useModal, useToast } from "@/components/providers";
import { mettreAJourMonProfil, mettreAJourMesCoordonnees, inviterUtilisateur } from "@/app/actions";

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
      {/* ===== Inviter un utilisateur — écriture réelle (compte Auth + profil) ===== */}
      <ModaleInviter />

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

      {/* ===== Mon profil (utilisateur app) — écriture réelle sur profiles ===== */}
      <ModaleMonProfil />

      {/* ===== Mon profil (employé portail) — écriture réelle via update_my_contact ===== */}
      <ModaleMesCoordonnees />

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
            <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Retaper le mot de passe" />
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

/** Mon profil (utilisateur app) — RÉEL : lit/écrit profiles (RLS id = auth.uid()). */
function ModaleMonProfil() {
  const { open, cm } = useModal();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open !== "mProfil") return;
    let vivant = true;
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !vivant) return;
      const { data } = await sb.from("profiles").select("full_name, phone").eq("id", user.id).single();
      if (data && vivant) { setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); }
    });
    return () => { vivant = false; };
  }, [open]);

  if (open !== "mProfil") return null;

  async function enregistrer() {
    setPending(true);
    const res = await mettreAJourMonProfil({ fullName, phone });
    setPending(false);
    if (res.ok) { cm(); toast("Profil mis à jour ✓"); }
    else toast(`Erreur : ${res.error}`);
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && cm()}>
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
            <div className="fld w"><label>Nom complet</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" /></div>
            <div className="fld"><label>Téléphone</label><input className="mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. : 628 44 12 07" /></div>
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={cm}>Annuler</button>
          <button className="btn btn-p" disabled={pending || !fullName.trim()} onClick={enregistrer}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}

/** Mes coordonnées (employé portail) — RÉEL : fonction update_my_contact (RLS via employee_id). */
function ModaleMesCoordonnees() {
  const { open, cm } = useModal();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [urgNom, setUrgNom] = useState("");
  const [urgTel, setUrgTel] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open !== "mProfilEmp") return;
    let vivant = true;
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !vivant) return;
      const { data: profil } = await sb.from("profiles").select("employee_id").eq("id", user.id).single();
      if (!profil?.employee_id) return;
      const { data } = await sb.from("employees")
        .select("phone, address, emergency_contact_name, emergency_contact_phone")
        .eq("id", profil.employee_id).single();
      if (data && vivant) {
        setPhone(data.phone ?? ""); setAdresse(data.address ?? "");
        setUrgNom(data.emergency_contact_name ?? ""); setUrgTel(data.emergency_contact_phone ?? "");
      }
    });
    return () => { vivant = false; };
  }, [open]);

  if (open !== "mProfilEmp") return null;

  async function enregistrer() {
    setPending(true);
    const res = await mettreAJourMesCoordonnees({ phone, address: adresse, emergencyName: urgNom, emergencyPhone: urgTel });
    setPending(false);
    if (res.ok) { cm(); toast("Coordonnées mises à jour ✓"); }
    else toast(`Erreur : ${res.error}`);
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && cm()}>
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
            <div className="fld"><label>Téléphone</label><input className="mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. : 628 44 12 07" /></div>
            <div className="fld w"><label>Adresse</label><input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Ex. : Commune de Ratoma, Conakry" /></div>
            <div className="fld"><label>Contact d’urgence</label><input value={urgNom} onChange={(e) => setUrgNom(e.target.value)} placeholder="Ex. : Fatou CAMARA (épouse)" /></div>
            <div className="fld"><label>Téléphone d’urgence</label><input className="mono" value={urgTel} onChange={(e) => setUrgTel(e.target.value)} placeholder="Ex. : 622 10 20 30" /></div>
          </div>
          <div className="alert vt">
            <span className="ic">✓</span>
            <div>Ces coordonnées sont modifiables par vous ; les autres informations (contrat, salaire) sont gérées par le service RH.</div>
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={cm}>Annuler</button>
          <button className="btn btn-p" disabled={pending} onClick={enregistrer}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}

/** Inviter un utilisateur — RÉEL : Server Action inviterUtilisateur (service_role côté serveur). */
function ModaleInviter() {
  const { open, cm } = useModal();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("employe");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (open !== "mInviter") return null;

  async function envoyer() {
    if (!email.trim() || !fullName.trim()) { setErreur("Nom et email obligatoires."); return; }
    setPending(true);
    setErreur(null);
    const res = await inviterUtilisateur({ email: email.trim(), fullName: fullName.trim(), role });
    setPending(false);
    if (res.ok) {
      setEmail(""); setFullName(""); setRole("employe");
      cm();
      toast(`Invitation envoyée à ${email} ✓`);
    } else setErreur(res.error);
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && cm()}>
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
            <div className="fld w"><label>Nom complet</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" /></div>
            <div className="fld w"><label>Adresse email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.gn" /></div>
            <div className="fld"><label>Rôle</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="employe">Employé (portail)</option>
                <option value="manager">Manager</option>
                <option value="rh">RH</option>
                <option value="comptable">Comptable</option>
                <option value="dg">Direction (lecture)</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="alert vt">
            <span className="ic">💡</span>
            <div><b>Rappel des droits :</b> un Manager ne voit que son équipe et jamais les salaires ; un Employé ne voit que ses propres bulletins et congés.</div>
          </div>
          {erreur && <div className="alert rg"><span className="ic">⚠</span><div>{erreur}</div></div>}
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={cm}>Annuler</button>
          <button className="btn btn-p" disabled={pending} onClick={envoyer}>{pending ? "Envoi…" : "Envoyer l’invitation"}</button>
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
