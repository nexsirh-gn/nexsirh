"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { creerPrimeType, creerAbsenceType } from "@/app/actions";

type PTab = "pt1" | "pt2" | "pt3" | "pt4" | "pt5" | "pt6";
const TABS: [PTab, string][] = [
  ["pt1", "Entreprise"], ["pt2", "Barème RTS"], ["pt3", "Cotisations"],
  ["pt4", "Jours fériés"], ["pt5", "Primes & absences"], ["pt6", "Utilisateurs"],
];

export default function Parametrage() {
  const [tab, setTab] = useState<PTab>("pt1");
  const [form, setForm] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const { om } = useModal();
  const toast = useToast();
  const [modalPrime, setModalPrime] = useState(false);
  const [modalAbsence, setModalAbsence] = useState(false);
  const [pCode, setPCode] = useState(""); const [pNom, setPNom] = useState("");
  const [pRts, setPRts] = useState(true); const [pCnss, setPCnss] = useState(true);
  const [aCode, setACode] = useState(""); const [aNom, setANom] = useState("");
  const [aPaye, setAPaye] = useState(true); const [aDroit, setADroit] = useState("");
  const [pendingRef, setPendingRef] = useState(false);

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const [company, brackets, rates, holidays, primes, absences, users] = await Promise.all([
      sb.from("companies").select("*").maybeSingle(),
      sb.from("tax_brackets").select("*").order("bracket_order"),
      sb.from("contribution_rates").select("*").order("code"),
      sb.from("public_holidays").select("*").eq("year", 2026).order("holiday_date"),
      sb.from("premium_types").select("*").order("code"),
      sb.from("leave_types").select("*").order("code"),
      sb.from("profiles").select("id, full_name, email, role, active, last_sign_in_at").order("full_name"),
    ]);
    return {
      company: company.data, brackets: brackets.data ?? [], rates: rates.data ?? [],
      holidays: holidays.data ?? [], primes: primes.data ?? [], absences: absences.data ?? [], users: users.data ?? [],
    };
  });

  if (loading) return <div className="note">Chargement du paramétrage…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const c = d.company;
  const cnss = d.rates.find((r) => r.code === "cnss");
  const vf = d.rates.find((r) => r.code === "vf");
  const cfpa = d.rates.find((r) => r.code === "cfpa");
  const v = (champ: string) => form[champ] ?? (c?.[champ] as string | null) ?? "";

  async function enregistrer() {
    if (!c) return;
    setPending(true);
    const { error: e } = await createClient().from("companies").update({
      name: v("name"), legal_form: v("legal_form"), nif: v("nif"),
      cnss_employer_number: v("cnss_employer_number"), address: v("address"),
      convention: v("convention"), bank_name: v("bank_name"), bank_account: v("bank_account"),
    }).eq("id", c.id);
    setPending(false);
    if (e) toast(`Erreur : ${e.message}`);
    else { toast("Modifications enregistrées ✓ — tracées dans l’audit"); refresh(); }
  }

  async function ajouterPrime() {
    if (!pCode.trim() || !pNom.trim()) { toast("Code et libellé obligatoires."); return; }
    setPendingRef(true);
    const res = await creerPrimeType({ code: pCode, name: pNom, taxableRts: pRts, subjectCnss: pCnss });
    setPendingRef(false);
    if (res.ok) { toast("Type de prime ajouté ✓"); setModalPrime(false); setPCode(""); setPNom(""); setPRts(true); setPCnss(true); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }
  async function ajouterAbsence() {
    if (!aCode.trim() || !aNom.trim()) { toast("Code et libellé obligatoires."); return; }
    setPendingRef(true);
    const res = await creerAbsenceType({ code: aCode, name: aNom, paid: aPaye, entitlementDays: aDroit ? Number(aDroit) : null });
    setPendingRef(false);
    if (res.ok) { toast("Type d’absence ajouté ✓"); setModalAbsence(false); setACode(""); setANom(""); setAPaye(true); setADroit(""); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  const ROLES: Record<string, [string, string]> = {
    admin: ["Admin", "bg-v"], rh: ["RH", "bg-v"], dg: ["Direction", "bg-b"],
    manager: ["Manager", "bg-o"], comptable: ["Comptable", "bg-g"], employe: ["Employé", "bg-g"],
  };

  return (
    <div>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "pt1" && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="hd"><h3>Informations de l’entreprise</h3><span className="sp" /><button className="btn btn-p btn-sm" disabled={pending} onClick={enregistrer}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
          <div className="bd fgrid">
            <div className="fld"><label>Raison sociale</label><input value={v("name")} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. : GARAYA HOLDING" /></div>
            <div className="fld"><label>Forme juridique</label><input value={v("legal_form")} onChange={(e) => setForm({ ...form, legal_form: e.target.value })} placeholder="Ex. : SARL" /></div>
            <div className="fld"><label>NIF</label><input className="mono" value={v("nif")} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="Ex. : 123456789" /></div>
            <div className="fld"><label>N° employeur CNSS</label><input className="mono" value={v("cnss_employer_number")} onChange={(e) => setForm({ ...form, cnss_employer_number: e.target.value })} placeholder="Ex. : 987654" /></div>
            <div className="fld w"><label>Adresse</label><input value={v("address")} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex. : Immeuble Kaloum, Conakry" /></div>
            <div className="fld"><label>Convention collective</label><input value={v("convention")} onChange={(e) => setForm({ ...form, convention: e.target.value })} placeholder="Ex. : Convention nationale interprofessionnelle" /></div>
            <div className="fld"><label>Banque de paie</label><input value={v("bank_name")} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Ex. : Ecobank Guinée" /></div>
          </div>
        </div>
      )}

      {tab === "pt2" && (
        <div>
          <div className="annot">Barème <b>{d.brackets[0]?.version_ref}</b> en vigueur depuis le <b>{d.brackets[0] ? new Date(d.brackets[0].effective_from).toLocaleDateString("fr-FR") : "—"}</b> — versionné par date d’effet, géré par la plateforme (console admin).</div>
          <div className="panel" style={{ maxWidth: 700 }}>
            <div className="hd"><h3>Barème RTS (retenue sur traitements et salaires)</h3></div>
            <table>
              <tbody>
                <tr><th>Tranche</th><th className="num">Plancher (GNF)</th><th className="num">Plafond (GNF)</th><th className="num">Taux</th></tr>
                {d.brackets.map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.bracket_order}</td>
                    <td className="gnf">{formatGNF(b.lower_bound)}</td>
                    <td className="gnf">{b.upper_bound ? formatGNF(b.upper_bound) : "—"}</td>
                    <td className="gnf"><b>{(b.rate * 100).toLocaleString("fr-FR")} %</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pt3" && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="hd"><h3>Cotisations sociales &amp; taxes</h3></div>
          <table>
            <tbody>
              <tr><th>Cotisation</th><th className="num">Part salariale</th><th className="num">Part patronale</th><th>Base / plafond</th></tr>
              <tr><td><b>CNSS</b></td><td className="gnf">{(cnss?.employee_rate ?? 0) * 100} %</td><td className="gnf">{(cnss?.employer_rate ?? 0) * 100} %</td><td>Brut plafonné à <span className="mono">{formatGNF(cnss?.ceiling)} GNF</span></td></tr>
              <tr><td><b>Versement Forfaitaire</b></td><td className="gnf">—</td><td className="gnf">{(vf?.employer_rate ?? 0) * 100} %</td><td>brut − MIN({formatGNF(vf?.abatement_value)} ; {(vf?.employer_rate ?? 0) * 100} % × brut)</td></tr>
              <tr><td><b>CFPA</b></td><td className="gnf">—</td><td className="gnf">{(cfpa?.employer_rate ?? 0) * 100} %</td><td>Total brut</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "pt4" && (
        <div className="panel" style={{ maxWidth: 640 }}>
          <div className="hd"><h3>Jours fériés 2026 — République de Guinée</h3></div>
          <table>
            <tbody>
              {d.holidays.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.holiday_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</td>
                  <td>{h.name}</td>
                  <td>{h.variable ? <span className="bg bg-b">Variable</span> : <span className="bg bg-g">Fixe</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "pt5" && (
        <div className="grid2">
          <div className="panel">
            <div className="hd"><h3>Types de primes &amp; indemnités</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => setModalPrime(true)}>+ Ajouter</button></div>
            <table>
              <tbody>
                <tr><th>Libellé</th><th>RTS</th><th>CNSS</th></tr>
                {d.primes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.taxable_rts ? <span className="bg bg-v">Imposable</span> : <span className="bg bg-b">Exonérée</span>}</td>
                    <td>{p.subject_cnss ? <span className="bg bg-v">Soumise</span> : <span className="bg bg-b">Exonérée</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="hd"><h3>Types d’absences</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => setModalAbsence(true)}>+ Ajouter</button></div>
            <table>
              <tbody>
                <tr><th>Type</th><th>Droit</th><th>Rémunéré</th></tr>
                {d.absences.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.entitlement_days ? `${a.entitlement_days} j` : a.code === "CA" ? "2,5 j ouvr./mois" : "selon événement"}</td>
                    <td>{a.paid ? <span className="bg bg-v">Oui</span> : <span className="bg bg-r">Non — déduite</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pt6" && (
        <div className="panel">
          <div className="hd"><h3>Utilisateurs de l’espace</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mInviter")}>+ Inviter un utilisateur</button></div>
          <table>
            <tbody>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th>Statut</th></tr>
              {d.users.map((u) => {
                const [lib, cls] = ROLES[u.role] ?? [u.role, "bg-g"];
                return (
                  <tr key={u.id}>
                    <td><div className="emp"><span className="av g">{u.full_name.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()}</span><div><b>{u.full_name}</b><small>{u.email}</small></div></div></td>
                    <td><span className={`bg ${cls}`}>{lib}</span></td>
                    <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}</td>
                    <td>{u.active ? <span className="bg bg-v">Actif</span> : <span className="bg bg-g">Inactif</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalPrime && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalPrime(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div><h3>Nouveau type de prime</h3><p>Précisez si elle est imposable RTS et soumise à CNSS (CLAUDE.md §6.4).</p></div>
              <button className="x" onClick={() => setModalPrime(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld"><label>Code</label><input className="mono" value={pCode} onChange={(e) => setPCode(e.target.value.toUpperCase())} placeholder="EX. PRIME_PERF" /></div>
                <div className="fld"><label>Libellé</label><input value={pNom} onChange={(e) => setPNom(e.target.value)} placeholder="Prime de performance" /></div>
                <div className="fld"><label>Imposable RTS ?</label>
                  <select value={pRts ? "1" : "0"} onChange={(e) => setPRts(e.target.value === "1")}><option value="1">Oui</option><option value="0">Non — exonérée</option></select>
                </div>
                <div className="fld"><label>Soumise CNSS ?</label>
                  <select value={pCnss ? "1" : "0"} onChange={(e) => setPCnss(e.target.value === "1")}><option value="1">Oui</option><option value="0">Non — exonérée</option></select>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalPrime(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pendingRef} onClick={ajouterPrime}>{pendingRef ? "Ajout…" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

      {modalAbsence && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalAbsence(false)}>
          <div className="mdl sm">
            <div className="mh">
              <div><h3>Nouveau type d’absence</h3><p>Le droit en jours est optionnel (ex. permission ponctuelle).</p></div>
              <button className="x" onClick={() => setModalAbsence(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld"><label>Code</label><input className="mono" value={aCode} onChange={(e) => setACode(e.target.value.toUpperCase())} placeholder="EX. CSANG" /></div>
                <div className="fld"><label>Libellé</label><input value={aNom} onChange={(e) => setANom(e.target.value)} placeholder="Congé pour don du sang" /></div>
                <div className="fld"><label>Rémunéré ?</label>
                  <select value={aPaye ? "1" : "0"} onChange={(e) => setAPaye(e.target.value === "1")}><option value="1">Oui</option><option value="0">Non — déduite</option></select>
                </div>
                <div className="fld"><label>Droit (jours, optionnel)</label><input className="mono" value={aDroit} onChange={(e) => setADroit(e.target.value.replace(/[^\d]/g, ""))} placeholder="ex. 3" /></div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalAbsence(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pendingRef} onClick={ajouterAbsence}>{pendingRef ? "Ajout…" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
