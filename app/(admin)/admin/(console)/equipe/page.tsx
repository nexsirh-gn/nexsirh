"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

const ROLES: Record<string, [string, string]> = {
  super_admin: ["Super-admin", "bg-r"], support: ["Support", "bg-o"],
  technique: ["Technique", "bg-b"], commercial: ["Commercial", "bg-g"],
};

export default function EquipeApi() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("admin_team_members").select("*").order("console_role");
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement de l’équipe…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;

  return (
    <div className="grid2">
      <div className="panel">
        <div className="hd"><h3>Équipe Nex’SIRH</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mInviterAdmin")}>+ Inviter</button></div>
        <table>
          <tbody>
            <tr><th>Membre</th><th>Rôle console</th><th>2FA</th></tr>
            {data!.map((m) => {
              const [lib, cls] = ROLES[m.console_role] ?? [m.console_role, "bg-g"];
              return (
                <tr key={m.id}>
                  <td><b>{m.name}</b> <small style={{ color: "var(--gris)" }}>{m.email}</small></td>
                  <td><span className={`bg ${cls}`}>{lib}</span></td>
                  <td>{m.twofa_enabled ? "✓" : "✗"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="bd">
          <div className="alert vt"><span className="ic">🛡</span><div><b>Droits :</b> Support = lecture + accès support avec consentement client. Technique = monitoring + migrations. Seul le Super-admin peut suspendre une entreprise ou publier un barème.</div></div>
        </div>
      </div>
      <div>
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="hd"><h3>Intégrations &amp; clés</h3></div>
          <table>
            <tbody>
              <tr><td><b>Supabase</b> <small style={{ color: "var(--gris)" }}>base + auth + storage</small></td><td><span className="sev ok" />Connecté</td><td></td></tr>
              <tr><td><b>Stripe</b> <small style={{ color: "var(--gris)" }}>paiements</small></td><td><span className="sev warn" />À configurer (étape V)</td><td></td></tr>
              <tr><td><b>Resend</b> <small style={{ color: "var(--gris)" }}>emails</small></td><td><span className="sev warn" />À configurer (étape X)</td><td></td></tr>
              <tr><td><b>Cloudinary</b> <small style={{ color: "var(--gris)" }}>fichiers</small></td><td><span className="sev ok" />Clés en place</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Zone sensible</h3></div>
          <div className="bd">
            <div className="stat-line"><span>Mode maintenance (bannière + lecture seule)</span><button className="btn btn-o btn-sm" onClick={() => toast("Mode maintenance : à câbler avec les annonces (étape X)")}>Activer</button></div>
            <div className="stat-line"><span>Restauration d’une sauvegarde</span><button className="btn btn-o btn-sm" onClick={() => toast("Restauration : via le dashboard Supabase — double validation requise")}>Ouvrir l’assistant</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
