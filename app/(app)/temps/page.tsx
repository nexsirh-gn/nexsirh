"use client";

import { useToast } from "@/components/providers";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";
import { validerFeuilleTemps } from "@/app/actions";

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

  const nomDe = (f: (typeof feuilles)[number]) => {
    const e = f.employees as unknown as { first_name: string; last_name: string } | null;
    return e ? `${e.last_name} ${e.first_name}` : "—";
  };

  return (
    <div>
      <div className="tools">
        <span className="note">Base légale : 40 h/sem · 173,33 h/mois · Majorations +25 % / +50 % / +100 % (dim. &amp; fériés)</span>
        <span className="sp" />
        <span className="bg bg-o">{aValider.length} à valider</span>
      </div>

      <div className="panel">
        <div className="hd"><h3>Récapitulatif mensuel — heures &amp; majorations</h3></div>
        <table>
          <tbody>
            <tr><th>Salarié</th><th>Période</th><th className="num">H. travaillées</th><th className="num">HS +25 %</th><th className="num">HS +50 %</th><th className="num">HS +100 %</th><th className="num">Montant HS (GNF)</th><th>Statut</th><th></th></tr>
            {feuilles.map((f) => (
              <tr key={f.id}>
                <td><b>{nomDe(f)}</b></td>
                <td>{MOIS[f.period_month]} {f.period_year}</td>
                <td className="gnf">{f.total_hours.toLocaleString("fr-FR")}</td>
                <td className="gnf">{f.overtime_25 || "—"}</td>
                <td className="gnf">{f.overtime_50 || "—"}</td>
                <td className="gnf">{f.overtime_100 || "—"}</td>
                <td className="gnf">{f.overtime_amount ? formatGNF(f.overtime_amount) : "—"}</td>
                <td>{f.status === "a_valider" ? <span className="bg bg-o">À valider</span> : <span className="bg bg-v">Validé</span>}</td>
                <td>{f.status === "a_valider" && (
                  <button className="btn btn-o btn-sm" onClick={() => valider(f.id)}>✓ Valider</button>
                )}</td>
              </tr>
            ))}
            {feuilles.length === 0 && <tr><td colSpan={9} className="note">Aucune feuille de temps.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
