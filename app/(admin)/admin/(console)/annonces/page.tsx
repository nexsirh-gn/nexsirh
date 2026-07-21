"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

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
  const annonces = data!;
  type Annonce = (typeof annonces)[number];

  const envoi = (a: Annonce) => a.status === "envoyee" && a.sent_at ? new Date(a.sent_at).toLocaleDateString("fr-FR")
    : a.status === "programmee" && a.scheduled_at ? `programmée ${new Date(a.scheduled_at).toLocaleDateString("fr-FR")}`
    : a.status;

  const colonnes: Colonne<Annonce>[] = [
    { id: "title", entete: "Annonce", triPar: (a) => a.title, cell: (a) => <b>{a.title}</b> },
    { id: "canal", entete: "Canal", triPar: (a) => CANAUX[a.channel] ?? a.channel, cell: (a) => CANAUX[a.channel] ?? a.channel },
    { id: "cible", entete: "Cible", triPar: (a) => a.target, cell: (a) => a.target },
    { id: "envoi", entete: "Envoyée", triPar: (a) => a.sent_at ?? a.scheduled_at ?? a.status, cell: (a) => envoi(a) },
    {
      id: "perf", entete: "Perf.", classeCell: "mono",
      cell: (a) => {
        const stats = a.stats as { open_rate?: number; conversion?: number };
        return stats.open_rate ? `${Math.round(stats.open_rate * 100)} % ouverture`
          : stats.conversion ? `${Math.round(stats.conversion * 100)} % → conversion` : "—";
      },
    },
    {
      id: "actions", entete: "", classeCell: "nowrap",
      cell: (a) => a.status === "programmee"
        ? <button className="btn btn-g btn-sm" onClick={() => toast("Annonce programmée annulée")}>Annuler</button>
        : <button className="btn btn-g btn-sm" onClick={() => om("mAnnonce")}>Dupliquer</button>,
    },
  ];

  return (
    <div>
      <div className="tools">
        <span className="note">Bannières in-app et emails envoyés aux entreprises clientes.</span>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => om("mAnnonce")}>+ Nouvelle annonce</button>
      </div>
      <DataTable
        colonnes={colonnes}
        lignes={annonces}
        cle={(a) => a.id}
        recherchePar={(a) => `${a.title} ${a.target} ${CANAUX[a.channel] ?? a.channel}`}
        placeholderRecherche="Titre, cible, canal…"
        piedLibelle={(n) => `${n} annonce${n > 1 ? "s" : ""}`}
        messageVide="Aucune annonce."
      />
    </div>
  );
}
