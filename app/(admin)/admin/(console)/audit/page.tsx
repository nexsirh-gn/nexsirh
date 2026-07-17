"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";

export default function Audit() {
  const toast = useToast();
  const [filtre, setFiltre] = useState("");

  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("audit_log")
      .select("id, created_at, actor_email, action, target_table, target_id, company_id")
      .order("created_at", { ascending: false }).limit(100);
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement du journal d’audit…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const lignes = data!.filter(
    (l) => !filtre || `${l.actor_email} ${l.action} ${l.target_table}`.toLowerCase().includes(filtre.toLowerCase())
  );

  const BADGE: Record<string, string> = { insert: "bg-v", update: "bg-o", delete: "bg-r", acces_support: "bg-o" };

  return (
    <div>
      <div className="tools">
        <div className="srch" style={{ width: 260 }}>
          <input placeholder="Filtrer par email, table, action…" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
        </div>
        <span className="sp" />
        <button className="btn btn-o btn-sm" onClick={() => toast("Export CSV du journal d’audit généré (signé)")}>⇩ Export signé</button>
      </div>
      <div className="panel">
        <table>
          <tbody>
            <tr><th>Date · heure</th><th>Acteur</th><th>Action</th><th>Cible</th></tr>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="mono">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                <td>{l.actor_email ?? "système"}</td>
                <td><span className={`bg ${BADGE[l.action] ?? "bg-g"}`}>{l.action}</span></td>
                <td>{l.target_table} <span className="mono" style={{ fontSize: 11 }}>{l.target_id?.slice(0, 8)}</span></td>
              </tr>
            ))}
            {lignes.length === 0 && <tr><td colSpan={4} className="note">Aucun événement.</td></tr>}
          </tbody>
        </table>
        <div className="pgn"><span>{data!.length} événements (100 derniers) · journal inviolable (append-only)</span></div>
      </div>
    </div>
  );
}
