"use client";

import { useModal } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

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

  type Ticket = (typeof tickets)[number];
  const nomTicketComp = (t: Ticket) => (t.companies as unknown as { name: string } | null)?.name ?? "—";
  const colonnes: Colonne<Ticket>[] = [
    { id: "number", entete: "#", triPar: (t) => t.number, classeCell: "mono", cell: (t) => t.number },
    { id: "subject", entete: "Sujet", triPar: (t) => t.subject, cell: (t) => <b>{t.subject}</b> },
    { id: "entreprise", entete: "Entreprise", triPar: (t) => nomTicketComp(t), cell: (t) => nomTicketComp(t) },
    { id: "priorite", entete: "Priorité", triPar: (t) => t.priority, cell: (t) => { const [pl, pc] = PRIO[t.priority] ?? [t.priority, "bg-g"]; return <span className={`bg ${pc}`}>{pl}</span>; } },
    { id: "assigne", entete: "Assigné à", triPar: (t) => t.assigned_to ?? "", cell: (t) => t.assigned_to ?? "—" },
    { id: "ouvert", entete: "Ouvert", triPar: (t) => t.created_at, cell: (t) => new Date(t.created_at).toLocaleDateString("fr-FR") },
    { id: "statut", entete: "Statut", triPar: (t) => t.status, cell: (t) => { const [sl, sc] = STAT[t.status] ?? [t.status, "bg-g"]; return <span className={`bg ${sc}`}>{sl}</span>; } },
    { id: "actions", entete: "", classeCell: "nowrap", cell: () => <button className="btn btn-o btn-sm" onClick={() => om("mTicket")}>Ouvrir</button> },
  ];

  return (
    <div>
      <DataTable
        colonnes={colonnes}
        lignes={tickets}
        cle={(t) => t.id}
        recherchePar={(t) => `${t.number} ${t.subject} ${nomTicketComp(t)} ${t.assigned_to ?? ""}`}
        placeholderRecherche="Ticket, sujet, entreprise…"
        filtres={[
          { id: "ouverts", label: "Ouverts", n: ouverts.length },
          { id: "urgents", label: "Urgents", n: tickets.filter((t) => t.priority === "urgent" && t.status !== "resolu").length },
          { id: "attente_client", label: "Attente client", n: tickets.filter((t) => t.status === "attente_client").length },
          { id: "resolu", label: "Résolus", n: tickets.filter((t) => t.status === "resolu").length },
          { id: "tous", label: "Tous", n: tickets.length },
        ]}
        filtreInitial="ouverts"
        filtrePredicat={(t, f) =>
          f === "tous" ? true
          : f === "ouverts" ? ["ouvert", "en_cours"].includes(t.status)
          : f === "urgents" ? t.priority === "urgent" && t.status !== "resolu"
          : f === "attente_client" ? t.status === "attente_client"
          : t.status === "resolu"}
        piedLibelle={(n) => `${n} ticket${n > 1 ? "s" : ""}`}
        messageVide="Aucun ticket."
      />
    </div>
  );
}
