"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useModal, useToast } from "@/components/providers";
import { ProfileMenu } from "@/components/profile-menu";

const NAV = [
  { href: "/portail", label: "Accueil" },
  { href: "/portail/mes-bulletins", label: "Mes bulletins" },
  { href: "/portail/mes-conges", label: "Mes congés" },
];

export default function PortailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { om } = useModal();
  const toast = useToast();
  return (
    <section className="full">
      <div className="portail-top">
        <div className="in">
          <span className="logo" style={{ fontSize: 16 }}>
            Nex<b>&rsquo;</b>SIRH <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 12 }}>· Mon espace</span>
          </span>
          <nav>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={pathname === n.href ? "on" : ""}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span style={{ flex: 1 }} />
          <ProfileMenu
            initials="BC"
            name="Bountouraby CAMARA"
            email="b.camara@garaya.gn"
            roleBadge={<span className="bg bg-g" style={{ marginTop: 3 }}>Rôle : Employé (portail)</span>}
            logoutHref="/connexion"
            logoutMessage="Vous êtes déconnecté(e) — à bientôt 👋"
            chipStyle={{ borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)" }}
            nameStyle={{ color: "#fff" }}
            smallStyle={{ color: "#A9CCC0" }}
            chevStyle={{ color: "#A9CCC0" }}
            links={[
              { icon: "👤", label: "Mon profil", onSelect: () => om("mProfilEmp") },
              { icon: "🔑", label: "Modifier le mot de passe", onSelect: () => om("mMdp") },
              { icon: "🔔", label: "Préférences de notifications", onSelect: () => om("mNotifs") },
              { icon: "❓", label: "Aide", onSelect: () => toast("Guide du portail employé ouvert 📖") },
            ]}
          />
        </div>
      </div>
      <div className="hero-emp">
        <h2>Bonjour Bountouraby 👋</h2>
        <p>
          Formatrice · D.R.H · GARAYA HOLDING — Solde de congés :{" "}
          <b className="mono" style={{ color: "var(--or)" }}>12,5 jours</b>
        </p>
      </div>
      <div className="main" style={{ maxWidth: 1000 }}>{children}</div>
    </section>
  );
}
