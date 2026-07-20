"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery, formatGNF, MOIS } from "@/lib/hooks";

export default function Rapports() {
  const toast = useToast();
  const [annee, setAnnee] = useState<number | null>(null);

  const { data, loading, error } = useQuery(async (sb) => {
    const [runs, slips, emps] = await Promise.all([
      sb.from("payroll_runs").select("id, period_year, period_month").order("period_year").order("period_month"),
      sb.from("payslips").select("payroll_run_id, gross, cnss_employee, cnss_employer, rts, vf, cfpa"),
      sb.from("employees").select("hire_date, birth_date, civility, status"),
    ]);
    const actifs = (emps.data ?? []).filter((e) => e.status !== "sorti");
    const annees = (dte: string) => (Date.now() - new Date(dte).getTime()) / (365.25 * 86400e3);
    return {
      runs: runs.data ?? [], slips: slips.data ?? [],
      nbActifs: actifs.length,
      ancMoy: actifs.length ? actifs.reduce((t, e) => t + annees(e.hire_date), 0) / actifs.length : 0,
      ageMoy: actifs.length ? actifs.reduce((t, e) => t + annees(e.birth_date), 0) / actifs.length : 0,
      pctFemmes: actifs.length
        ? Math.round((actifs.filter((e) => e.civility && e.civility !== "M.").length / actifs.length) * 100)
        : 0,
    };
  });

  if (loading) return <div className="note">Calcul des indicateurs…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;

  // Années disponibles (issues des périodes de paie), la plus récente en tête.
  // Repli sur l'année courante si aucune paie n'a encore été générée.
  const anneesDispo = [...new Set(d.runs.map((r) => r.period_year))].sort((a, b) => b - a);
  const anneesListe = anneesDispo.length ? anneesDispo : [new Date().getFullYear()];
  const anneeSel = annee ?? anneesListe[0];

  // Rattache chaque bulletin à l'année de sa période, puis filtre.
  const anneeDeRun = new Map(d.runs.map((r) => [r.id, r.period_year]));
  const runsAnnee = d.runs.filter((r) => r.period_year === anneeSel);
  const slipsAnnee = d.slips.filter((s) => anneeDeRun.get(s.payroll_run_id) === anneeSel);

  const parMois = runsAnnee.map((r) => {
    const s = d.slips.filter((x) => x.payroll_run_id === r.id);
    return {
      label: `${MOIS[r.period_month].slice(0, 4)} ${r.period_year}`,
      cout: s.reduce((t, x) => t + x.gross + x.cnss_employer + x.vf + x.cfpa, 0),
    };
  });
  const maxCout = Math.max(1, ...parMois.map((m) => m.cout));
  const { nbActifs, ancMoy, ageMoy, pctFemmes } = d;
  const cumulRts = slipsAnnee.reduce((t, s) => t + s.rts, 0);
  const cumulCnss = slipsAnnee.reduce((t, s) => t + s.cnss_employee + s.cnss_employer, 0);

  return (
    <div>
      <div className="tools">
        {anneesListe.map((a) => (
          <button key={a} className={`chip ${a === anneeSel ? "on" : ""}`} onClick={() => setAnnee(a)}>{a}</button>
        ))}
        <span className="sp" />
        <a className="btn btn-o" href={`/api/documents/generer?type=bilan_social&format=xlsx&annee=${anneeSel}`}
          onClick={() => toast(`Génération du bilan social ${anneeSel} (Excel)…`)}>⇩ Bilan social Excel</a>
        <button className="btn btn-o" onClick={() => toast("Connexion Power BI : lien de source de données copié")}>◫ Source Power BI</button>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>Coût employeur par période (GNF) — {anneeSel}</h3></div>
          <div className="bd">
            <div className="bars">
              {parMois.map((m, i) => (
                <div key={m.label} className={`bar ${i === parMois.length - 1 ? "hl" : ""}`}>
                  <i style={{ height: `${Math.round((m.cout / maxCout) * 85)}%` }} />
                  <small>{m.label}</small>
                </div>
              ))}
              {parMois.length === 0 && <div className="note">Aucune paie générée pour {anneeSel}.</div>}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Indicateurs — {anneeSel}</h3></div>
          <div className="bd">
            <div className="stat-line"><span>Effectif actif</span><b className="mono">{nbActifs}</b></div>
            <div className="stat-line"><span>Ancienneté moyenne</span><b className="mono">{ancMoy.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ans</b></div>
            <div className="stat-line"><span>Âge moyen</span><b className="mono">{ageMoy.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ans</b></div>
            <div className="stat-line"><span>Ratio femmes / hommes</span><b className="mono">{nbActifs ? `${pctFemmes} % / ${100 - pctFemmes} %` : "—"}</b></div>
            <div className="stat-line"><span>Cumul RTS versé {anneeSel}</span><b className="gnf">{formatGNF(cumulRts)}</b></div>
            <div className="stat-line"><span>Cumul CNSS (sal. + pat.) {anneeSel}</span><b className="gnf">{formatGNF(cumulCnss)}</b></div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="hd"><h3>États prêts à imprimer</h3><span className="sp" /><span className="bg bg-g">États annuels : {anneeSel}</span></div>
        <table>
          <tbody>
            {([
              ["État des effectifs par département", "effectifs_departement"],
              ["Registre de l’employeur (inspection du travail)", "registre_personnel"],
              ["Synthèse masse salariale annuelle", `synthese_masse_salariale&annee=${anneeSel}`],
              ["État des contrats à échéance", "contrats_echeance"],
            ] as [string, string][]).map(([t, type]) => (
              <tr key={type}>
                <td>📄 {t}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <a className="btn btn-o btn-sm" href={`/api/documents/generer?type=${type}`} target="_blank" rel="noopener"
                    onClick={() => toast(`Génération PDF : ${t}…`)}>PDF</a>
                  {" "}
                  <a className="btn btn-o btn-sm" href={`/api/documents/generer?type=${type}&format=xlsx`} target="_blank" rel="noopener"
                    onClick={() => toast(`Génération Excel : ${t}…`)}>⇩ Excel</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
