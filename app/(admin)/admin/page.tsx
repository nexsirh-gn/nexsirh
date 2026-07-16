"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";

export default function ConnexionConsole() {
  const router = useRouter();
  const toast = useToast();
  return (
    <section className="full adm">
      <div className="auth">
        <div className="auth-side">
          <div className="logo">
            Nex<b>&rsquo;</b>SIRH <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.75 }}>· CONSOLE</span>
          </div>
          <div>
            <h1>Console<br />Administrateur.</h1>
            <p>Pilotage de la plateforme : entreprises clientes, abonnements, barèmes légaux, support et supervision.</p>
            <div style={{ marginTop: 26 }}>
              <span className="bg" style={{ background: "rgba(217,164,65,.18)", color: "var(--or)" }}>Accès restreint — équipe Nex’SIRH uniquement</span>
            </div>
          </div>
          <div className="pt">Toutes les actions de cette console sont journalisées.</div>
        </div>
        <div className="auth-main">
          <div className="card auth-card">
            <h2>Accès sécurisé 🛡</h2>
            <p className="sub">Authentification à deux facteurs obligatoire.</p>
            <div className="fld"><label>Email @nexsirh.gn</label><input type="email" defaultValue="admin@nexsirh.gn" /></div>
            <div className="fld"><label>Mot de passe</label><input type="password" defaultValue="••••••••••••" /></div>
            <div className="fld"><label>Code 2FA (application)</label><input className="mono" placeholder="000 000" style={{ letterSpacing: ".3em", textAlign: "center" }} /></div>
            <button
              className="btn btn-p"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => { toast("Connexion console — session tracée dans l’audit 🛡"); router.push("/admin/dashboard"); }}
            >
              Entrer dans la console
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
