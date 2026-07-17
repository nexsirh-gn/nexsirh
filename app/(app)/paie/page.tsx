"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF, initiales, MOIS } from "@/lib/hooks";
import { cloturerPaie } from "@/app/actions";

export default function Paie() {
  const { om } = useModal();
  const toast = useToast();
  const [runIdx, setRunIdx] = useState(0);
  const [modalCloture, setModalCloture] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const runs = await sb.from("payroll_runs")
      .select("id, period_year, period_month, status, generated_at")
      .order("period_year", { ascending: false }).order("period_month", { ascending: false });
    if (runs.error) throw runs.error;
    const bulletins = await Promise.all(
      (runs.data ?? []).map((r) =>
        sb.from("payslips")
          .select("id, employee_name, matricule, position_title, gross, cnss_employee, cnss_employer, rts, vf, cfpa, loans_deduction, other_deductions, net_pay")
          .eq("payroll_run_id", r.id).order("matricule")
          .then((res) => res.data ?? [])
      )
    );
    return { runs: runs.data ?? [], bulletins };
  });

  if (loading) return <div className="note">Chargement de la paie…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const { runs, bulletins } = data!;
  if (runs.length === 0) return <div className="alert or"><span className="ic">ⓘ</span><div>Aucun cycle de paie. Générez la première paie du mois.</div></div>;

  const run = runs[runIdx];
  const slips = bulletins[runIdx];
  const totBrut = slips.reduce((s, b) => s + b.gross, 0);
  const totSal = slips.reduce((s, b) => s + b.cnss_employee + b.rts, 0);
  const totPat = slips.reduce((s, b) => s + b.cnss_employer + b.vf + b.cfpa, 0);
  const totNet = slips.reduce((s, b) => s + b.net_pay, 0);
  const totRts = slips.reduce((s, b) => s + b.rts, 0);
  const totCnss = slips.reduce((s, b) => s + b.cnss_employee + b.cnss_employer, 0);
  const libStatut = run.status === "brouillon" ? "Brouillon" : run.status === "cloture" ? "Clôturé" : "Validé";

  async function confirmerCloture() {
    if (confirmation !== "CLOTURER") { toast("Tapez « CLOTURER » pour confirmer."); return; }
    setPending(true);
    const res = await cloturerPaie(run.id);
    setPending(false);
    setModalCloture(false);
    setConfirmation("");
    if (res.ok) { toast(`Paie de ${MOIS[run.period_month].toLowerCase()} ${run.period_year} clôturée — ${slips.length} bulletins archivés 🔒`); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  return (
    <div>
      <div className="tools">
        <select style={{ width: 210 }} value={runIdx} onChange={(e) => setRunIdx(Number(e.target.value))}>
          {runs.map((r, i) => (
            <option key={r.id} value={i}>
              {MOIS[r.period_month]} {r.period_year}{r.status === "cloture" ? " — Clôturé" : ""}
            </option>
          ))}
        </select>
        <span className={`bg ${run.status === "brouillon" ? "bg-o" : run.status === "cloture" ? "bg-g" : "bg-v"}`}>{libStatut}</span>
        <span className="note">{run.generated_at ? `Générée le ${new Date(run.generated_at).toLocaleDateString("fr-FR")}` : ""} · {slips.length} bulletins</span>
        <span className="sp" />
        <button className="btn btn-o" onClick={() => om("mJournal")}>📒 Journal de paie</button>
        {run.status !== "cloture" && (
          <button className="btn btn-or" onClick={() => setModalCloture(true)}>🔒 Clôturer la période</button>
        )}
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Total brut</div><div className="v">{formatGNF(totBrut)}</div><div className="d">GNF · {slips.length} salariés</div></div>
        <div className="kpi"><div className="l">Cotisations salariales</div><div className="v">{formatGNF(totSal)}</div><div className="d">CNSS 5 % + RTS</div></div>
        <div className="kpi"><div className="l">Charges patronales</div><div className="v">{formatGNF(totPat)}</div><div className="d">CNSS 18 % + VF 6 % + CFPA 1,5 %</div></div>
        <div className="kpi gold"><div className="l">Net à payer</div><div className="v">{formatGNF(totNet)}</div><div className="d">virements de fin de mois</div></div>
      </div>

      <div className="panel">
        <div className="hd"><h3>Bulletins — {MOIS[run.period_month]} {run.period_year}</h3></div>
        <table>
          <tbody>
            <tr><th>Salarié</th><th className="num">Brut</th><th className="num">CNSS sal.</th><th className="num">RTS</th><th className="num">Retenues</th><th className="num">Net à payer</th><th>Statut</th><th></th></tr>
            {slips.map((b) => (
              <tr key={b.id}>
                <td><div className="emp"><span className="av g">{initiales(b.employee_name)}</span><div><b>{b.employee_name}</b><small>{b.position_title}</small></div></div></td>
                <td className="gnf">{formatGNF(b.gross)}</td>
                <td className="gnf">{formatGNF(b.cnss_employee)}</td>
                <td className="gnf">{formatGNF(b.rts)}</td>
                <td className="gnf" style={b.loans_deduction + b.other_deductions > 0 ? { color: "var(--rouge)" } : undefined}>
                  {b.loans_deduction + b.other_deductions > 0 ? formatGNF(b.loans_deduction + b.other_deductions) : "—"}
                </td>
                <td className="gnf"><b>{formatGNF(b.net_pay)}</b></td>
                <td><span className={`bg ${run.status === "brouillon" ? "bg-o" : "bg-v"}`}>{libStatut}</span></td>
                <td>
                  <button className="btn btn-o btn-sm" onClick={() => om("mBulletin")}>Bulletin</button>{" "}
                  <a className="btn btn-g btn-sm" href={`/api/documents/bulletin/${b.id}`}
                    onClick={() => toast("Téléchargement du bulletin PDF…")}>⇩ PDF</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pgn"><span>{slips.length} bulletins — total net <b className="mono">{formatGNF(totNet)} GNF</b></span></div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Déclarations à produire</h3></div>
          <table>
            <tbody>
              <tr><td>📄 État RTS mensuel — format eTax (DNI)</td><td className="gnf mono">{formatGNF(totRts)} GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => om("mDocsAdmin")}>Générer</button></td></tr>
              <tr><td>📄 Déclaration CNSS mensuelle</td><td className="gnf mono">{formatGNF(totCnss)} GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => om("mDocsAdmin")}>Générer</button></td></tr>
              <tr><td>🏦 Ordre de virement groupé</td><td className="gnf mono">{formatGNF(totNet)} GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => toast("Fichier de virements exporté")}>Exporter</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Cycle de la période</h3></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl"><small>{run.generated_at ? new Date(run.generated_at).toLocaleDateString("fr-FR") : "—"}</small><b>Génération</b> — {slips.length} bulletins calculés en brouillon.</div>
              <div className={`tl ${run.status === "brouillon" ? "gold" : ""}`}><small>{run.status === "brouillon" ? "en attente" : "✓"}</small><b>Validation</b> — contrôle des bulletins, recalcul possible.</div>
              <div className="tl" style={run.status !== "cloture" ? { opacity: 0.45 } : undefined}><small>{run.status === "cloture" ? "✓" : "—"}</small><b>Clôture</b> — montants figés, verrouillage rétroactif (trigger SQL).</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de clôture — action réelle */}
      {modalCloture && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalCloture(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div className="ic-warn">🔒</div>
              <div><h3>Clôturer la paie de {MOIS[run.period_month].toLowerCase()} {run.period_year} ?</h3><p>Cette action est définitive.</p></div>
              <button className="x" onClick={() => setModalCloture(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="stat-line"><span>Bulletins concernés</span><b className="mono">{slips.length}</b></div>
              <div className="stat-line"><span>Net total à virer</span><b className="gnf">{formatGNF(totNet)} GNF</b></div>
              <div className="alert or" style={{ marginTop: 14 }}><span className="ic">⚠</span><div>Après clôture : montants <b>figés et archivés</b>, tout UPDATE est rejeté par la base. Correction = <b>régularisation sur le mois suivant</b>.</div></div>
              <div className="fld" style={{ marginTop: 14 }}>
                <label>Tapez « CLOTURER » pour confirmer</label>
                <input className="mono" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="CLOTURER" />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalCloture(false)}>Annuler</button>
              <button className="btn btn-or" disabled={pending || confirmation !== "CLOTURER"} onClick={confirmerCloture}>
                {pending ? "Clôture…" : "🔒 Clôturer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
