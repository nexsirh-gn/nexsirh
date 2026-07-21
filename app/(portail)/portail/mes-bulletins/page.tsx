"use client";

import { useToast } from "@/components/providers";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

export default function MesBulletins() {
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const res = await sb.from("payslips")
      .select("id, gross, net_pay, payroll_runs!inner(period_year, period_month)")
      .order("created_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement de vos bulletins…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const bulletins = data!;
  type Bulletin = (typeof bulletins)[number];
  const runDe = (b: Bulletin) => b.payroll_runs as unknown as { period_year: number; period_month: number };

  const colonnes: Colonne<Bulletin>[] = [
    { id: "periode", entete: "Période", triPar: (b) => { const r = runDe(b); return r.period_year * 100 + r.period_month; }, cell: (b) => { const r = runDe(b); return `${MOIS[r.period_month]} ${r.period_year}`; } },
    { id: "brut", entete: "Brut", num: true, triPar: (b) => b.gross, classeCell: "gnf", cell: (b) => formatGNF(b.gross) },
    { id: "net", entete: "Net perçu", num: true, triPar: (b) => b.net_pay, classeCell: "gnf", cell: (b) => <b>{formatGNF(b.net_pay)}</b> },
    {
      id: "actions", entete: "", classeCell: "nowrap",
      cell: (b) => <>
        <a className="btn btn-o btn-sm" href={`/api/documents/bulletin/${b.id}?inline=1`} target="_blank" rel="noreferrer">Aperçu</a>{" "}
        <a className="btn btn-g btn-sm" href={`/api/documents/bulletin/${b.id}`} onClick={() => toast("Téléchargement du bulletin PDF…")}>⇩ PDF</a>
      </>,
    },
  ];

  return (
    <DataTable
      titre="Mes bulletins de paie"
      colonnes={colonnes}
      lignes={bulletins}
      cle={(b) => b.id}
      taillePage={12}
      piedLibelle={(n) => `${n} bulletin${n > 1 ? "s" : ""}`}
      messageVide="Aucun bulletin disponible."
    />
  );
}
