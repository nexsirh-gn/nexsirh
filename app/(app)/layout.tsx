"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useModal, useToast } from "@/components/providers";
import { ProfileMenu } from "@/components/profile-menu";

const TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/employes": "Employés",
  "/paie": "Paie mensuelle — Juillet 2026",
  "/conges": "Congés & absences",
  "/temps": "Temps & présence",
  "/documents": "Documents",
  "/rapports": "Rapports & indicateurs",
  "/parametrage": "Paramétrage",
  "/abonnement": "Abonnement & facturation",
};

const NAV = [
  { href: "/dashboard", ico: "◫", label: "Tableau de bord" },
  { sec: "Gestion RH" },
  { href: "/employes", ico: "👥", label: "Employés" },
  { href: "/conges", ico: "🌴", label: "Congés & absences" },
  { href: "/temps", ico: "⏱", label: "Temps & présence" },
  { sec: "Paie & finances" },
  { href: "/paie", ico: "⛣", label: "Paie mensuelle" },
  { href: "/documents", ico: "📄", label: "Documents" },
  { href: "/rapports", ico: "📊", label: "Rapports" },
  { sec: "Administration" },
  { href: "/parametrage", ico: "⚙", label: "Paramétrage" },
  { href: "/abonnement", ico: "❖", label: "Abonnement" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { om } = useModal();
  const toast = useToast();
  const title =
    TITLES[pathname] ?? (pathname.startsWith("/employes/") ? "Fiche employé" : "");

  return (
    <div id="appShell">
      <aside className="rail">
        <div className="logo">Nex<b>&rsquo;</b>SIRH</div>
        {NAV.map((n, i) =>
          "sec" in n ? (
            <div key={i} className="sec">{n.sec}</div>
          ) : (
            <Link
              key={n.href}
              href={n.href!}
              className={pathname === n.href || (n.href === "/employes" && pathname.startsWith("/employes")) ? "on" : ""}
            >
              <span className="ico">{n.ico}</span> {n.label}
            </Link>
          )
        )}
        <div className="bot">
          <div className="usr">
            <span className="av">MT</span>
            <div>
              <b style={{ fontSize: 13, color: "#fff" }}>Michel TOLNO</b>
              <small>D.R.H — GARAYA HOLDING</small>
            </div>
          </div>
        </div>
      </aside>
      <div>
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <span className="crumb">GARAYA HOLDING · Juillet 2026</span>
          </div>
          <span className="sp" />
          <div className="srch"><input placeholder="Rechercher un salarié, un document…" /></div>
          <button className="bell">🔔<i /></button>
          <button className="btn btn-p btn-sm" onClick={() => om("mNouvelEmploye")}>+ Nouvel employé</button>
          <ProfileMenu
            initials="MT"
            name="Michel TOLNO"
            email="D.R.H — RH admin"
            roleBadge={<span className="bg bg-v" style={{ marginTop: 3 }}>Rôle : RH (admin)</span>}
            footer="Connecté depuis 09:12 · GARAYA HOLDING · v1.0"
            logoutHref="/connexion"
            logoutMessage="Vous êtes déconnecté(e) — à bientôt 👋"
            links={[
              { icon: "👤", label: "Mon profil", onSelect: () => om("mProfil") },
              { icon: "🔑", label: "Modifier le mot de passe", onSelect: () => om("mMdp") },
              { icon: "🔔", label: "Préférences de notifications", onSelect: () => om("mNotifs") },
              { icon: "❓", label: "Aide & support", onSelect: () => toast("Centre d’aide ouvert — guides et contact support 📚") },
              { icon: "🛡", label: "Mes connexions", onSelect: () => toast("Journal de vos connexions affiché — dernière : aujourd’hui 09:12") },
            ]}
          />
        </div>
        <div className="main">{children}</div>
      </div>
    </div>
  );
}
