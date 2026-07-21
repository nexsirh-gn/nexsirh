"use client";

import { useToast } from "@/components/providers";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";
import { validerFeuilleTemps } from "@/app/actions";
import { DataTable, type Colonne } from "@/components/data-table";

export default function Temps() {
  const toast = useToast();

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const res = await sb.from("timesheets")
      .select("id, period_year, period_month, total_hours, overtime_25, overtime_50, overtime_100, overtime_amount, status, employees(first_name, last_name)")
      .order("period_year", { ascending: false }).order("period_month", { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  });

  if (loading) return <div className="note">Chargement des feuilles de temps…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const feuilles = data!;
  const aValider = feuilles.filter((f) => f.status === "a_valider");

  async function valider(id: string) {
    const res = await validerFeuilleTemps(id);
    if (res.ok) { toast("Feuille validée et transmise à la paie ✓"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  type Feuille = (typeof feuilles)[number];
  const nomDe = (f: Feuille) => {
    const e = f.employees as unknown as { first_name: string; last_name: string } | null;
    return e ? `${e.last_name} ${e.first_name}` : "—";
  };

  const colonnes: Colonne<Feuille>[] = [
    { id: "salarie", entete: "Salarié", triPar: (f) => nomDe(f), cell: (f) => <b>{nomDe(f)}</b> },
    { id: "periode", entete: "Période", triPar: (f) => f.period_year * 100 + f.period_month, cell: (f) => `${MOIS[f.period_month]} ${f.period_year}` },
    { id: "total_hours", entete: "H. travaillées", num: true, triPar: (f) => f.total_hours, classeCell: "gnf", cell: (f) => f.total_hours.toLocaleString("fr-FR") },
    { id: "ot25", entete: "HS +25 %", num: true, triPar: (f) => f.overtime_25, classeCell: "gnf", cell: (f) => f.overtime_25 || "—" },
    { id: "ot50", entete: "HS +50 %", num: true, triPar: (f) => f.overtime_50, classeCell: "gnf", cell: (f) => f.overtime_50 || "—" },
    { id: "ot100", entete: "HS +100 %", num: true, triPar: (f) => f.overtime_100, classeCell: "gnf", cell: (f) => f.overtime_100 || "—" },
    { id: "montant", entete: "Montant HS (GNF)", num: true, triPar: (f) => f.overtime_amount, classeCell: "gnf", cell: (f) => f.overtime_amount ? formatGNF(f.overtime_amount) : "—" },
    { id: "statut", entete: "Statut", triPar: (f) => f.status, cell: (f) => f.status === "a_valider" ? <span className="bg bg-o">À valider</span> : <span className="bg bg-v">Validé</span> },
    { id: "actions", entete: "", classeCell: "nowrap", cell: (f) => f.status === "a_valider" ? <button className="btn btn-o btn-sm" onClick={() => valider(f.id)}>✓ Valider</button> : null },
  ];

  return (
    <div>
      <div className="tools">
        <span className="note">Base légale : 40 h/sem · 173,33 h/mois · Majorations +25 % / +50 % / +100 % (dim. &amp; fériés)</span>
        <span className="sp" />
        <span className="bg bg-o">{aValider.length} à valider</span>
      </div>
      <DataTable
        titre="Récapitulatif mensuel — heures & majorations"
        colonnes={colonnes}
        lignes={feuilles}
        cle={(f) => f.id}
        recherchePar={(f) => `${nomDe(f)} ${MOIS[f.period_month]} ${f.period_year}`}
        placeholderRecherche="Salarié, période…"
        piedLibelle={(n) => `${n} feuille${n > 1 ? "s" : ""} de temps`}
        messageVide="Aucune feuille de temps."
      />
    </div>
  );
}
