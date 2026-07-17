"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useModal, useToast } from "@/components/providers";
import { ProfileMenu } from "@/components/profile-menu";
import { useQuery, initiales } from "@/lib/hooks";

const NAV = [
  { href: "/portail", label: "Accueil" },
  { href: "/portail/mes-bulletins", label: "Mes bulletins" },
  { href: "/portail/mes-conges", label: "Mes congés" },
];

export default function PortailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { om } = useModal();
  const toast = useToast();

  const { data: moi } = useQuery(async (sb) => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profil } = await sb
      .from("profiles")
      .select("full_name, email, employee_id, companies(name), employees:employee_id(first_name, positions(title), departments(name))")
      .eq("id", user.id).single();
    const { data: solde } = await sb.from("leave_balances")
      .select("entitled_days, seniority_bonus_days, carryover_days, taken_days")
      .eq("year", 2026).maybeSingle();
    return { profil, solde };
  });

  const nom = moi?.profil?.full_name ?? "…";
  const emp = moi?.profil?.employees as unknown as { first_name: string; positions: { title: string } | null; departments: { name: string } | null } | null;
  const soldeDispo = moi?.solde
    ? moi.solde.entitled_days + moi.solde.seniority_bonus_days + moi.solde.carryover_days - moi.solde.taken_days
    : null;

  return (
    <section className="full">
      <div className="portail-top">
        <div className="in">
          <span className="logo" style={{ fontSize: 16 }}>
            Nex<b>&rsquo;</b>SIRH <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 12 }}>· Mon espace</span>
          </span>
          <nav>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={pathname === n.href ? "on" : ""}>{n.label}</Link>
            ))}
          </nav>
          <span style={{ flex: 1 }} />
          <ProfileMenu
            initials={initiales(nom)}
            name={nom}
            email={moi?.profil?.email ?? ""}
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
        <h2>Bonjour {emp?.first_name ?? nom.split(" ").pop()} 👋</h2>
        <p>
          {emp?.positions?.title ?? ""} · {emp?.departments?.name ?? ""} ·{" "}
          {(moi?.profil?.companies as unknown as { name: string } | null)?.name ?? ""} — Solde de congés :{" "}
          <b className="mono" style={{ color: "var(--or)" }}>
            {soldeDispo != null ? `${soldeDispo.toLocaleString("fr-FR")} jours` : "—"}
          </b>
        </p>
      </div>
      <div className="main" style={{ maxWidth: 1000 }}>{children}</div>
    </section>
  );
}
