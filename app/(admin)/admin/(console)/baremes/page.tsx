"use client";

import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";

export default function Baremes() {
  const { om } = useModal();
  const toast = useToast();

  const { data, loading, error } = useQuery(async (sb) => {
    const [brackets, rates, holidays] = await Promise.all([
      sb.from("tax_brackets").select("*").order("version_ref").order("bracket_order"),
      sb.from("contribution_rates").select("*").order("code"),
      sb.from("public_holidays").select("*").eq("year", 2026).order("holiday_date"),
    ]);
    return { brackets: brackets.data ?? [], rates: rates.data ?? [], holidays: holidays.data ?? [] };
  });

  if (loading) return <div className="note">Chargement des barèmes…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const versions = [...new Set(d.brackets.map((b) => b.version_ref))];
  const active = versions[versions.length - 1];
  const tranches = d.brackets.filter((b) => b.version_ref === active);
  const vf = d.rates.find((r) => r.code === "vf");
  const cnss = d.rates.find((r) => r.code === "cnss");
  const cfpa = d.rates.find((r) => r.code === "cfpa");

  return (
    <div>
      <div className="alert or" style={{ maxWidth: 900 }}>
        <span className="ic">⚖</span>
        <div><b>Référentiels partagés par toutes les entreprises.</b> Chaque modification crée une <b>nouvelle version datée</b> : les paies déjà clôturées restent calculées avec l’ancienne version. Publication bloquée si la simulation sur les 8 bulletins GARAYA échoue.</div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="hd"><h3>Barème RTS — versions</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mBareme")}>+ Nouvelle version</button></div>
          <table>
            <tbody>
              <tr><th>Version</th><th>En vigueur du</th><th>Tranches</th><th>Statut</th></tr>
              {versions.map((v) => (
                <tr key={v}>
                  <td className="mono">{v}</td>
                  <td>{new Date(d.brackets.find((b) => b.version_ref === v)!.effective_from).toLocaleDateString("fr-FR")}</td>
                  <td>{d.brackets.filter((b) => b.version_ref === v).map((b) => `${b.rate * 100}`).join(" / ")} %</td>
                  <td>{v === active ? <span className="bg bg-v">Active</span> : <span className="bg bg-g">Archivée</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bd">
            <table>
              <tbody>
                <tr><th>Tranche (net imposable)</th><th className="num">Taux {active}</th></tr>
                {tranches.map((t) => (
                  <tr key={t.id}>
                    <td>{formatGNF(t.lower_bound)} – {t.upper_bound ? formatGNF(t.upper_bound) : "au-delà"} GNF</td>
                    <td className="gnf"><b>{(t.rate * 100).toLocaleString("fr-FR")} %</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="hd"><h3>Cotisations sociales</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => om("mBareme")}>✎ Nouvelle version</button></div>
            <table>
              <tbody>
                <tr><th>Cotisation</th><th className="num">Sal.</th><th className="num">Pat.</th><th>Base / plafond</th></tr>
                <tr><td><b>CNSS</b></td><td className="gnf">{(cnss?.employee_rate ?? 0) * 100} %</td><td className="gnf">{(cnss?.employer_rate ?? 0) * 100} %</td><td>plafond <span className="mono">{formatGNF(cnss?.ceiling)}</span></td></tr>
                <tr><td><b>Versement Forfaitaire</b></td><td className="gnf">—</td><td className="gnf">{(vf?.employer_rate ?? 0) * 100} %</td><td>abattement {vf?.abatement_type === "fixed" ? `fixe ${formatGNF(vf?.abatement_value)}` : `${vf?.abatement_value} %`} <span className="bg bg-o">à confirmer §6.5</span></td></tr>
                <tr><td><b>CFPA</b></td><td className="gnf">—</td><td className="gnf">{(cfpa?.employer_rate ?? 0) * 100} %</td><td>total brut</td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="hd"><h3>Jours fériés — Guinée 2026</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Formulaire d’ajout de jour férié ouvert")}>+ Ajouter</button></div>
            <div className="bd" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {d.holidays.map((h) => (
                <span key={h.id} className={`bg ${h.variable ? "bg-b" : "bg-g"}`}>
                  {new Date(h.holiday_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} {h.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
