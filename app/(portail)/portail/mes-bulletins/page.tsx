"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";

export default function MesBulletins() {
  const { om } = useModal();
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

  return (
    <div className="panel">
      <div className="hd"><h3>Mes bulletins de paie</h3></div>
      <table>
        <tbody>
          <tr><th>Période</th><th className="num">Brut</th><th className="num">Net perçu</th><th></th></tr>
          {data!.map((b) => {
            const run = b.payroll_runs as unknown as { period_year: number; period_month: number };
            return (
              <tr key={b.id}>
                <td>{MOIS[run.period_month]} {run.period_year}</td>
                <td className="gnf">{formatGNF(b.gross)}</td>
                <td className="gnf"><b>{formatGNF(b.net_pay)}</b></td>
                <td>
                  <button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Aperçu</button>{" "}
                  <a className="btn btn-g btn-sm" href={`/api/documents/bulletin/${b.id}`}
                    onClick={() => toast("Téléchargement du bulletin PDF…")}>⇩ PDF</a>
                </td>
              </tr>
            );
          })}
          {data!.length === 0 && <tr><td colSpan={4} className="note">Aucun bulletin disponible.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
