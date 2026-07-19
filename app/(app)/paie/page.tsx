"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery, formatGNF, initiales, MOIS } from "@/lib/hooks";
import { cloturerPaie, genererPaie, recalculerPaie, ajouterAjustement, supprimerPaie } from "@/app/actions";

type Slip = {
  id: string; employee_name: string; matricule: string; position_title: string | null;
  gross: number; cnss_employee: number; cnss_employer: number; rts: number; vf: number; cfpa: number;
  loans_deduction: number; other_deductions: number; net_pay: number;
};

export default function Paie() {
  const toast = useToast();
  const [runIdx, setRunIdx] = useState(0);
  const [modalCloture, setModalCloture] = useState(false);
  const [modalRecalcul, setModalRecalcul] = useState(false);
  const [ajustement, setAjustement] = useState<Slip | null>(null);
  const [typeAj, setTypeAj] = useState<"retenue" | "rappel">("retenue");
  const [libelleAj, setLibelleAj] = useState("");
  const [montantAj, setMontantAj] = useState("");
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
          .then((res) => (res.data ?? []) as Slip[])
      )
    );
    return { runs: runs.data ?? [], bulletins };
  });

  if (loading) return <div className="note">Chargement de la paie…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const { runs, bulletins } = data!;

  // Prochaine période à générer : mois suivant la dernière (ou mois courant si aucune)
  const derniere = runs[0];
  const prochaine = derniere
    ? derniere.period_month === 12
      ? { y: derniere.period_year + 1, m: 1 }
      : { y: derniere.period_year, m: derniere.period_month + 1 }
    : { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };

  async function lancerGeneration() {
    setPending(true);
    const res = await genererPaie(prochaine.y, prochaine.m);
    setPending(false);
    if (res.ok) { toast(`Paie de ${MOIS[prochaine.m].toLowerCase()} ${prochaine.y} générée — ${res.nb} bulletins en brouillon ✓`); setRunIdx(0); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  if (runs.length === 0) {
    return (
      <div>
        <div className="alert or"><span className="ic">ⓘ</span><div>Aucun cycle de paie. Générez la première paie du mois.</div></div>
        <button className="btn btn-p" disabled={pending} onClick={lancerGeneration}>
          {pending ? "Génération…" : `＋ Générer la paie de ${MOIS[prochaine.m].toLowerCase()} ${prochaine.y}`}
        </button>
      </div>
    );
  }

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

  async function lancerRecalcul() {
    setPending(true);
    const res = await recalculerPaie(run.id);
    setPending(false);
    setModalRecalcul(false);
    if (res.ok) { toast(`Recalcul terminé — ${res.nb} bulletins mis à jour, saisies manuelles conservées ✓`); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  async function validerAjustement() {
    if (!ajustement) return;
    const montant = Number(montantAj.replace(/\D/g, ""));
    setPending(true);
    const res = await ajouterAjustement(ajustement.id, typeAj, libelleAj, montant);
    setPending(false);
    if (res.ok) {
      toast(`${typeAj === "rappel" ? "Rappel" : "Retenue"} de ${formatGNF(montant)} GNF appliqué(e) — bulletin recalculé ✓`);
      setAjustement(null); setLibelleAj(""); setMontantAj("");
      refresh();
    } else toast(`Erreur : ${res.error}`);
  }

  async function supprimerBrouillon() {
    setPending(true);
    const res = await supprimerPaie(run.id);
    setPending(false);
    if (res.ok) { toast("Période en brouillon supprimée."); setRunIdx(0); refresh(); }
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
        <button className="btn btn-o" disabled={pending} onClick={lancerGeneration}>
          ＋ Générer {MOIS[prochaine.m].toLowerCase()} {prochaine.y}
        </button>
        {run.status !== "cloture" && (
          <button className="btn btn-o" onClick={() => setModalRecalcul(true)}>↻ Recalculer tout</button>
        )}
        <a className="btn btn-o" href={`/api/documents/generer?type=journal_paie&run=${run.id}`}
          onClick={() => toast("Génération du journal de paie PDF…")}>📒 Journal PDF ⇩</a>
        <a className="btn btn-o" href={`/api/documents/generer?type=journal_paie&run=${run.id}&format=xlsx`}
          onClick={() => toast("Génération du journal de paie Excel…")}>📊 Journal Excel ⇩</a>
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
                <td style={{ whiteSpace: "nowrap" }}>
                  {run.status !== "cloture" && (
                    <><button className="btn btn-o btn-sm" onClick={() => setAjustement(b)}>± Ajustement</button>{" "}</>
                  )}
                  <a className="btn btn-g btn-sm" href={`/api/documents/bulletin/${b.id}`}
                    onClick={() => toast("Téléchargement du bulletin PDF…")}>⇩ PDF</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pgn">
          <span>{slips.length} bulletins — total net <b className="mono">{formatGNF(totNet)} GNF</b></span>
          {run.status === "brouillon" && (
            <button className="btn btn-g btn-sm" style={{ width: "auto", padding: "4px 10px" }} disabled={pending} onClick={supprimerBrouillon}>
              🗑 Supprimer ce brouillon
            </button>
          )}
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Déclarations à produire</h3></div>
          <table>
            <tbody>
              <tr><td>📄 État RTS mensuel — format eTax (DNI)</td><td className="gnf mono">{formatGNF(totRts)} GNF</td><td style={{ textAlign: "right" }}><a className="btn btn-o btn-sm" href={`/api/documents/generer?type=etat_rts&run=${run.id}`} onClick={() => toast("Génération de l’état RTS…")}>⇩ Générer</a></td></tr>
              <tr><td>📄 Déclaration CNSS mensuelle</td><td className="gnf mono">{formatGNF(totCnss)} GNF</td><td style={{ textAlign: "right" }}><a className="btn btn-o btn-sm" href={`/api/documents/generer?type=declaration_cnss&run=${run.id}`} onClick={() => toast("Génération de la déclaration CNSS…")}>⇩ Générer</a></td></tr>
              <tr><td>🏦 Ordre de virement groupé</td><td className="gnf mono">{formatGNF(totNet)} GNF</td><td style={{ textAlign: "right" }}><button className="btn btn-o btn-sm" onClick={() => toast("Fichier de virements exporté")}>Exporter</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Cycle de la période</h3></div>
          <div className="bd">
            <div className="timeline">
              <div className="tl"><small>{run.generated_at ? new Date(run.generated_at).toLocaleDateString("fr-FR") : "—"}</small><b>Génération</b> — {slips.length} bulletins calculés en brouillon.</div>
              <div className={`tl ${run.status === "brouillon" ? "gold" : ""}`}><small>{run.status === "brouillon" ? "en cours" : "✓"}</small><b>Validation</b> — recalcul et ajustements possibles, saisies manuelles conservées.</div>
              <div className="tl" style={run.status !== "cloture" ? { opacity: 0.45 } : undefined}><small>{run.status === "cloture" ? "✓" : "—"}</small><b>Clôture</b> — montants figés (trigger SQL). Correction = rappel/reprise sur le mois suivant.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modale recalcul ===== */}
      {modalRecalcul && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalRecalcul(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div className="ic-warn">↻</div>
              <div><h3>Recalculer les {slips.length} bulletins ?</h3><p>Période en brouillon — recalcul autorisé.</p></div>
              <button className="x" onClick={() => setModalRecalcul(false)}>✕</button>
            </div>
            <div className="mb">
              <p style={{ fontSize: 13.5 }}>
                Les bulletins seront régénérés à partir des fiches salariés, des feuilles de temps validées et du barème en vigueur.
                Les saisies manuelles (rappels, retenues) sont <b>conservées</b>.
              </p>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalRecalcul(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pending} onClick={lancerRecalcul}>{pending ? "Recalcul…" : "↻ Lancer le recalcul"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modale ajustement manuel (rappel / retenue) ===== */}
      {ajustement && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setAjustement(null)}>
          <div className="mdl sm">
            <div className="mh">
              <div><h3>Ajustement manuel</h3><p>{ajustement.employee_name} · {MOIS[run.period_month]} {run.period_year} — la saisie survivra au recalcul.</p></div>
              <button className="x" onClick={() => setAjustement(null)}>✕</button>
            </div>
            <div className="mb">
              <div className="fld"><label>Type</label>
                <select value={typeAj} onChange={(e) => setTypeAj(e.target.value as "retenue" | "rappel")}>
                  <option value="retenue">Retenue / reprise (diminue le net)</option>
                  <option value="rappel">Rappel (gain imposable, réinjecté dans la chaîne)</option>
                </select>
              </div>
              <div className="fld"><label>Libellé</label><input value={libelleAj} onChange={(e) => setLibelleAj(e.target.value)} placeholder="Ex. : avance sur salaire, rappel juin…" /></div>
              <div className="fld"><label>Montant (GNF)</label><input className="mono" value={montantAj} onChange={(e) => setMontantAj(e.target.value)} placeholder="100 000" /></div>
              <div className="alert or"><span className="ic">⚠</span><div>Une retenue ne peut pas rendre le net négatif : la génération est bloquée dans ce cas (§6.7), jamais de silencieux.</div></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setAjustement(null)}>Annuler</button>
              <button className="btn btn-p" disabled={pending || !libelleAj.trim() || !montantAj} onClick={validerAjustement}>
                {pending ? "Application…" : "Appliquer et recalculer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modale de clôture ===== */}
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
