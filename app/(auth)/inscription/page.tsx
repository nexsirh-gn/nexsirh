"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

export default function Inscription() {
  const [step, setStep] = useState<2 | 3>(2);
  const [f, setF] = useState({
    raisonSociale: "", formeJuridique: "SARL", nif: "", cnssEmployeur: "", adresse: "",
    prenom: "", nom: "", email: "", password: "", confirmation: "",
  });
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function creer() {
    if (f.password !== f.confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }
    setPending(true);
    setErreur(null);
    const res = await fetch("/api/inscription", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    const json = await res.json();
    if (!res.ok) { setErreur(json.error ?? "Erreur lors de la création."); setPending(false); return; }
    // Connexion immédiate
    const sb = createClient();
    await sb.auth.signInWithPassword({ email: f.email, password: f.password });
    toast(`Espace ${f.raisonSociale} créé 🎉 — essai de 30 jours activé`);
    router.push("/dashboard");
    router.refresh();
  }

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
                  <div className="fld w"><label>Raison sociale *</label><input value={f.raisonSociale} onChange={set("raisonSociale")} placeholder="Ex. : GARAYA HOLDING" /></div>
                  <div className="fld"><label>Forme juridique</label>
                    <select value={f.formeJuridique} onChange={set("formeJuridique")}>
                      <option>SARL</option><option>SARLU</option><option>SA</option><option>SAS</option>
                    </select>
                  </div>
                  <div className="fld"><label>NIF</label><input className="mono" value={f.nif} onChange={set("nif")} /></div>
                  <div className="fld"><label>N° employeur CNSS</label><input className="mono" value={f.cnssEmployeur} onChange={set("cnssEmployeur")} /></div>
                  <div className="fld w"><label>Adresse</label><input value={f.adresse} onChange={set("adresse")} placeholder="Quartier, commune, ville" /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-p" style={{ flex: 1, justifyContent: "center" }} disabled={!f.raisonSociale} onClick={() => setStep(3)}>Continuer</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <h2>Votre compte administrateur</h2>
                <p className="sub">Étape 3 sur 3 — Vous pourrez inviter d’autres utilisateurs ensuite.</p>
                <div className="fgrid">
                  <div className="fld"><label>Prénom *</label><input value={f.prenom} onChange={set("prenom")} /></div>
                  <div className="fld"><label>Nom *</label><input value={f.nom} onChange={set("nom")} /></div>
                  <div className="fld w"><label>Email professionnel *</label><input type="email" value={f.email} onChange={set("email")} /></div>
                  <div className="fld"><label>Mot de passe *</label><input type="password" value={f.password} onChange={set("password")} placeholder="8 caractères min." /></div>
                  <div className="fld"><label>Confirmation *</label><input type="password" value={f.confirmation} onChange={set("confirmation")} /></div>
                </div>
                {erreur && <div className="alert rg"><span className="ic">⚠</span><div>{erreur}</div></div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-o" onClick={() => setStep(2)}>← Retour</button>
                  <button className="btn btn-p" style={{ flex: 1, justifyContent: "center" }}
                    disabled={pending || !f.email || !f.password || !f.prenom || !f.nom}
                    onClick={creer}>
                    {pending ? "Création…" : "Créer mon espace"}
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
