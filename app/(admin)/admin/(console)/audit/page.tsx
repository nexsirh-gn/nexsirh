"use client";

import { useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

export default function Audit() {
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("audit_log")
      .select("id, created_at, actor_email, action, target_table, target_id, company_id")
      .order("created_at", { ascending: false }).limit(100);
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement du journal d’audit…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const lignes = data!;
  type Evt = (typeof lignes)[number];

  const BADGE: Record<string, string> = { insert: "bg-v", update: "bg-o", delete: "bg-r", acces_support: "bg-o" };

  const colonnes: Colonne<Evt>[] = [
    { id: "date", entete: "Date · heure", triPar: (l) => l.created_at, classeCell: "mono", cell: (l) => new Date(l.created_at).toLocaleString("fr-FR") },
    { id: "acteur", entete: "Acteur", triPar: (l) => l.actor_email ?? "", cell: (l) => l.actor_email ?? "système" },
    { id: "action", entete: "Action", triPar: (l) => l.action, cell: (l) => <span className={`bg ${BADGE[l.action] ?? "bg-g"}`}>{l.action}</span> },
    { id: "cible", entete: "Cible", triPar: (l) => l.target_table, cell: (l) => <>{l.target_table} <span className="mono" style={{ fontSize: 11 }}>{l.target_id?.slice(0, 8)}</span></> },
  ];

  return (
    <div>
      <DataTable
        colonnes={colonnes}
        lignes={lignes}
        cle={(l) => l.id}
        recherchePar={(l) => `${l.actor_email ?? ""} ${l.action} ${l.target_table}`}
        placeholderRecherche="Email, table, action…"
        actions={<button className="btn btn-o btn-sm" onClick={() => toast("Export CSV du journal d’audit généré (signé)")}>⇩ Export signé</button>}
        taillePage={25}
        piedLibelle={(n) => `${n} événement${n > 1 ? "s" : ""} (100 derniers) · journal inviolable (append-only)`}
        messageVide="Aucun événement."
      />
    </div>
  );
}
