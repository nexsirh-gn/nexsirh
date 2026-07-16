"use client";

import Link from "next/link";
import { useToast } from "@/components/providers";

export default function MotDePasseOublie() {
  const toast = useToast();
  return (
    <section className="full">
      <div className="auth">
        <div className="auth-side">
          <div className="logo">Nex<b>&rsquo;</b>SIRH</div>
          <div>
            <h1>Récupérez<br />votre accès.</h1>
            <p>Un lien sécurisé de réinitialisation vous sera envoyé par email.</p>
          </div>
          <div className="pt">Besoin d’aide ? support@nexsirh.gn</div>
        </div>
        <div className="auth-main">
          <div className="card auth-card">
            <h2>Mot de passe oublié</h2>
            <p className="sub">Saisissez l’email associé à votre compte.</p>
            <div className="fld"><label>Adresse email</label><input type="email" placeholder="vous@entreprise.gn" /></div>
            <button className="btn btn-p" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Email de réinitialisation envoyé ✓")}>
              Envoyer le lien
            </button>
            <p style={{ textAlign: "center", marginTop: 18 }}>
              <Link className="link" href="/connexion">← Retour à la connexion</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
