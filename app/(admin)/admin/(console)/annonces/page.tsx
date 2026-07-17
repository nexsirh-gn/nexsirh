"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

const CANAUX: Record<string, string> = {
  banniere: "Bannière in-app", email: "Email", banniere_email: "Email + bannière", email_auto: "Email auto",
};

export default function Annonces() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("announcements").select("*").order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement des annonces…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;

  return (
    <div>
      <div className="tools">
        <span className="note">Bannières in-app et emails envoyés aux entreprises clientes.</span>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => om("mAnnonce")}>+ Nouvelle annonce</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Annonce</th><th>Canal</th><th>Cible</th><th>Envoyée</th><th>Perf.</th><th></th></tr>
            {data!.map((a) => {
              const stats = a.stats as { open_rate?: number; conversion?: number };
              return (
                <tr key={a.id}>
                  <td><b>{a.title}</b></td>
                  <td>{CANAUX[a.channel] ?? a.channel}</td>
                  <td>{a.target}</td>
                  <td>{a.status === "envoyee" && a.sent_at ? new Date(a.sent_at).toLocaleDateString("fr-FR")
                    : a.status === "programmee" && a.scheduled_at ? `programmée ${new Date(a.scheduled_at).toLocaleDateString("fr-FR")}`
                    : a.status}</td>
                  <td className="mono">{stats.open_rate ? `${Math.round(stats.open_rate * 100)} % ouverture`
                    : stats.conversion ? `${Math.round(stats.conversion * 100)} % → conversion` : "—"}</td>
                  <td>{a.status === "programmee"
                    ? <button className="btn btn-g btn-sm" onClick={() => toast("Annonce programmée annulée")}>Annuler</button>
                    : <button className="btn btn-g btn-sm" onClick={() => om("mAnnonce")}>Dupliquer</button>}</td>
                </tr>
              );
            })}
            {data!.length === 0 && <tr><td colSpan={6} className="note">Aucune annonce.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
