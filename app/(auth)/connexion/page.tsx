"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";

export default function Connexion() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function seConnecter() {
    setPending(true);
    setErreur(null);
    const sb = createClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setErreur("Identifiants incorrects. Vérifiez votre email et votre mot de passe.");
      setPending(false);
      return;
    }
    const { data: profil } = await sb
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();
    toast(`Connexion réussie — bienvenue ${profil?.full_name ?? ""}`);
    router.push(profil?.role === "employe" ? "/portail" : profil?.role === "super_admin" ? "/admin/dashboard" : "/dashboard");
    router.refresh();
  }

  return (
    <section className="full">
      <div className="auth">
        <div className="auth-side">
          <div className="logo">
            Nex<b>&rsquo;</b>SIRH <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.8 }}>Guinée</span>
          </div>
          <div>
            <h1>La paie guinéenne,<br />enfin simple.</h1>
            <p>Personnel, paie CNSS &amp; RTS, congés et documents officiels — pour les PME jusqu’à 50 salariés.</p>
            <div style={{ marginTop: 26, display: "flex", gap: 10 }}>
              <span className="bg" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>Conforme Loi L/2014/072/CNT</span>
              <span className="bg" style={{ background: "rgba(217,164,65,.2)", color: "var(--or)" }}>Barème RTS à jour</span>
            </div>
          </div>
          <div className="pt">© 2026 Nex’SIRH · Conakry, Guinée</div>
        </div>
        <div className="auth-main">
          <div className="card auth-card">
            <h2>Bon retour 👋</h2>
            <p className="sub">Connectez-vous à votre espace entreprise.</p>
            <div className="fld">
              <label>Adresse email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.gn" />
            </div>
            <div className="fld">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && seConnecter()} />
            </div>
            {erreur && (
              <div className="alert rg"><span className="ic">⚠</span><div>{erreur}</div></div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <label style={{ display: "flex", gap: 7, alignItems: "center", textTransform: "none", letterSpacing: 0, fontSize: 13, margin: 0, color: "var(--encre)" }}>
                <input type="checkbox" defaultChecked style={{ width: "auto" }} /> Rester connecté
              </label>
              <Link className="link" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
            </div>
            <button className="btn btn-p" style={{ width: "100%", justifyContent: "center" }} onClick={seConnecter} disabled={pending}>
              {pending ? "Connexion…" : "Se connecter"}
            </button>
            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--gris)" }}>
              Nouvelle entreprise ? <Link className="link" href="/inscription">Démarrer l’essai gratuit 30 jours</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
