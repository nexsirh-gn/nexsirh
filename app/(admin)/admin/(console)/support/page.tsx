"use client";

import { useModal } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

export default function Support() {
  const { om } = useModal();
  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("support_tickets")
      .select("id, number, subject, priority, status, assigned_to, created_at, companies(name)")
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement des tickets…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const tickets = data!;
  const ouverts = tickets.filter((t) => ["ouvert", "en_cours"].includes(t.status));

  const PRIO: Record<string, [string, string]> = { urgent: ["Urgent", "bg-r"], normal: ["Normal", "bg-o"], basse: ["Basse", "bg-g"] };
  const STAT: Record<string, [string, string]> = {
    ouvert: ["Ouvert", "bg-o"], en_cours: ["En cours", "bg-o"],
    attente_client: ["Attente client", "bg-b"], resolu: ["Résolu", "bg-v"], ferme: ["Fermé", "bg-g"],
  };

  return (
    <div>
      <div className="tools">
        <span className="chip on">Ouverts · {ouverts.length}</span>
        <span className="chip">Urgents · {tickets.filter((t) => t.priority === "urgent" && t.status !== "resolu").length}</span>
        <span className="chip">Attente client · {tickets.filter((t) => t.status === "attente_client").length}</span>
        <span className="chip">Résolus · {tickets.filter((t) => t.status === "resolu").length}</span>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>#</th><th>Sujet</th><th>Entreprise</th><th>Priorité</th><th>Assigné à</th><th>Ouvert</th><th>Statut</th><th></th></tr>
            {tickets.map((t) => {
              const [pl, pc] = PRIO[t.priority] ?? [t.priority, "bg-g"];
              const [sl, sc] = STAT[t.status] ?? [t.status, "bg-g"];
              return (
                <tr key={t.id}>
                  <td className="mono">{t.number}</td>
                  <td><b>{t.subject}</b></td>
                  <td>{(t.companies as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td><span className={`bg ${pc}`}>{pl}</span></td>
                  <td>{t.assigned_to ?? "—"}</td>
                  <td>{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                  <td><span className={`bg ${sc}`}>{sl}</span></td>
                  <td><button className="btn btn-o btn-sm" onClick={() => om("mTicket")}>Ouvrir</button></td>
                </tr>
              );
            })}
            {tickets.length === 0 && <tr><td colSpan={8} className="note">Aucun ticket.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
