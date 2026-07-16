"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useModal, useToast } from "@/components/providers";
import { ProfileMenu } from "@/components/profile-menu";

const TITLES: Record<string, string> = {
  "/admin/dashboard": "Vue d’ensemble",
  "/admin/entreprises": "Entreprises clientes",
  "/admin/abonnements": "Abonnements & facturation",
  "/admin/plans": "Plans & tarifs",
  "/admin/baremes": "Barèmes légaux — Guinée",
  "/admin/support": "Support client",
  "/admin/annonces": "Annonces & communication",
  "/admin/monitoring": "Monitoring & santé",
  "/admin/audit": "Audit & sécurité",
  "/admin/equipe": "Équipe & API",
};

const NAV = [
  { href: "/admin/dashboard", ico: "◫", label: "Vue d’ensemble" },
  { sec: "Clients" },
  { href: "/admin/entreprises", ico: "🏢", label: "Entreprises" },
  { href: "/admin/abonnements", ico: "❖", label: "Abonnements" },
  { href: "/admin/plans", ico: "❤", label: "Plans & tarifs" },
  { sec: "Référentiels légaux" },
  { href: "/admin/baremes", ico: "⚖", label: "Barèmes (RTS, CNSS…)" },
  { sec: "Opérations" },
  { href: "/admin/support", ico: "🎧", label: "Support" },
  { href: "/admin/annonces", ico: "📣", label: "Annonces" },
  { href: "/admin/monitoring", ico: "📈", label: "Monitoring" },
  { href: "/admin/audit", ico: "🛡", label: "Audit & sécurité" },
  { href: "/admin/equipe", ico: "⚙", label: "Équipe & API" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { om } = useModal();
  const toast = useToast();
  const title =
    TITLES[pathname] ?? (pathname.startsWith("/admin/entreprises/") ? "Fiche entreprise" : "");

  return (
    <div id="appShell" className="adm">
      <aside className="rail">
        <div className="logo">
          Nex<b>&rsquo;</b>SIRH <span style={{ fontSize: 10, color: "var(--or)", letterSpacing: ".1em" }}>ADMIN</span>
        </div>
        {NAV.map((n, i) =>
          "sec" in n ? (
            <div key={i} className="sec">{n.sec}</div>
          ) : (
            <Link
              key={n.href}
              href={n.href!}
              className={pathname === n.href || (n.href === "/admin/entreprises" && pathname.startsWith("/admin/entreprises")) ? "on" : ""}
            >
              <span className="ico">{n.ico}</span> {n.label}
            </Link>
          )
        )}
        <div className="bot">
          <div className="usr">
            <span className="av">SA</span>
            <div>
              <b style={{ fontSize: 13, color: "#fff" }}>Super Admin</b>
              <small>admin@nexsirh.gn · 2FA ✓</small>
            </div>
          </div>
        </div>
      </aside>
      <div>
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <span className="crumb">Plateforme Nex’SIRH · Dimanche 12 juillet 2026</span>
          </div>
          <span className="sp" />
          <div className="srch"><input placeholder="Entreprise, NIF, email, ticket…" /></div>
          <button className="bell" onClick={() => toast("3 notifications : 1 impayé, 1 incident résolu, 1 ticket urgent")}>🔔<i /></button>
          <button className="btn btn-p btn-sm" onClick={() => om("mNouvelleEntreprise")}>+ Entreprise</button>
          <ProfileMenu
            initials="SA"
            avatarClass="av"
            name="Super Admin"
            email="Console plateforme"
            roleBadge={<span className="bg bg-r" style={{ marginTop: 3 }}>Super-admin · 2FA ✓</span>}
            footer="Session : 09:41 · IP 102.176.44.10 · expire dans 4 h"
            logoutHref="/admin"
            logoutMessage="Session console terminée — déconnexion tracée 🛡"
            links={[
              { icon: "👤", label: "Mon profil & sécurité", onSelect: () => om("mProfilAdm") },
              { icon: "🔑", label: "Modifier le mot de passe", onSelect: () => om("mMdpAdm") },
              { icon: "🛡", label: "Journal de mes actions", onSelect: () => { toast("Journal filtré sur vos actions 🛡"); router.push("/admin/audit"); } },
              { icon: "⚙", label: "Équipe & API", onSelect: () => router.push("/admin/equipe") },
            ]}
          />
        </div>
        <div className="main">{children}</div>
      </div>
    </div>
  );
}
