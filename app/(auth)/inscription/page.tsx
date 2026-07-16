"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";

export default function Inscription() {
  const [step, setStep] = useState<2 | 3>(2);
  const router = useRouter();
  const toast = useToast();

  return (
    <section className="full">
      <div className="auth">
        <div className="auth-side">
          <div className="logo">Nex<b>&rsquo;</b>SIRH</div>
          <div>
            <h1>30 jours d’essai.<br />Sans carte bancaire.</h1>
            <p>Créez votre espace, importez vos salariés depuis Excel et générez votre première paie aujourd’hui.</p>
            <div style={{ marginTop: 30, display: "grid", gap: 14, fontSize: 14 }}>
              <div>✓ &nbsp;Paie validée sur des bulletins réels</div>
              <div>✓ &nbsp;Bulletins PDF, attestations, certificats</div>
              <div>✓ &nbsp;Import de vos données Excel en 5 minutes</div>
            </div>
          </div>
          <div className="pt">Déjà 40+ PME nous font confiance à Conakry</div>
        </div>
        <div className="auth-main">
          <div className="card auth-card" style={{ width: 480 }}>
            <div className="steps">
              <span className="on" /><span className="on" /><span className={step === 3 ? "on" : ""} />
            </div>
            {step === 2 && (
              <div>
                <h2>Créer votre entreprise</h2>
                <p className="sub">Étape 2 sur 3 — Informations légales</p>
                <div className="fgrid">
                  <div className="fld w"><label>Raison sociale</label><input defaultValue="GARAYA HOLDING" /></div>
                  <div className="fld"><label>Forme juridique</label><select><option>SARL</option><option>SARLU</option><option>SA</option><option>SAS</option></select></div>
                  <div className="fld"><label>NIF</label><input placeholder="375106275" className="mono" /></div>
                  <div className="fld"><label>N° employeur CNSS</label><input placeholder="—" className="mono" /></div>
                  <div className="fld"><label>Effectif</label><select defaultValue="16 – 50 salariés"><option>1 – 15 salariés</option><option>16 – 50 salariés</option></select></div>
                  <div className="fld w"><label>Adresse</label><input defaultValue="Kipé, Commune de Ratoma, Conakry" /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-o" onClick={() => toast("Retour à l’étape 1 — Votre email")}>← Retour</button>
                  <button className="btn btn-p" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep(3)}>Continuer</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <h2>Votre compte administrateur</h2>
                <p className="sub">Étape 3 sur 3 — Vous pourrez inviter d’autres utilisateurs ensuite.</p>
                <div className="fgrid">
                  <div className="fld"><label>Prénom</label><input defaultValue="Michel" /></div>
                  <div className="fld"><label>Nom</label><input defaultValue="TOLNO" /></div>
                  <div className="fld w"><label>Email professionnel</label><input type="email" defaultValue="m.tolno@garaya-holding.gn" /></div>
                  <div className="fld"><label>Mot de passe</label><input type="password" placeholder="8 caractères min." /></div>
                  <div className="fld"><label>Confirmation</label><input type="password" placeholder="••••••••" /></div>
                  <div className="fld w"><label>Votre rôle</label><select><option>D.R.H / Responsable RH</option><option>Gérant / Directeur Général</option><option>Comptable</option></select></div>
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", textTransform: "none", letterSpacing: 0, fontSize: 12.5, color: "var(--gris)", margin: "4px 0 14px" }}>
                  <input type="checkbox" defaultChecked style={{ width: "auto", marginTop: 2 }} /> J’accepte les conditions d’utilisation et la politique de confidentialité des données RH.
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-o" onClick={() => setStep(2)}>← Retour</button>
                  <button
                    className="btn btn-p"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => { toast("Espace GARAYA HOLDING créé 🎉 — essai de 30 jours activé"); router.push("/dashboard"); }}
                  >
                    Créer mon espace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
