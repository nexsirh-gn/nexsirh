"use client";

import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { creerEmploye } from "@/app/actions";

const ETAPES = ["Identité", "Coordonnées", "Professionnel", "Contrat", "Salaire & primes", "Banque"];

const VIDE = {
  civility: "M.", last_name: "", first_name: "", birth_date: "", birth_place: "",
  nationality: "Guinéenne", marital_status: "Célibataire", children_count: "0",
  address: "", phone: "", email: "", emergency_contact_name: "", emergency_contact_phone: "",
  department_id: "", position_id: "", manager_id: "", category: "Employé", cnss_number: "",
  contract_type: "CDI", hire_date: "", contract_end_date: "", trial_end_date: "",
  base_salary: "", seniority_bonus: "0", meal_allowance: "0", housing_allowance: "0",
  transport_allowance: "0", cost_of_living_allowance: "0",
  bank_name: "", bank_account: "", payment_mode: "Virement",
};

export function NouvelEmployeModal() {
  const { open, cm } = useModal();
  const toast = useToast();
  const [etape, setEtape] = useState(0);
  const [f, setF] = useState({ ...VIDE });
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: refs } = useQuery(async (sb) => {
    const [deps, posts, managers] = await Promise.all([
      sb.from("departments").select("id, name").order("name"),
      sb.from("positions").select("id, title").order("title"),
      sb.from("employees").select("id, first_name, last_name, matricule").in("status", ["actif", "essai"]).order("matricule"),
    ]);
    return { deps: deps.data ?? [], posts: posts.data ?? [], managers: managers.data ?? [] };
  });

  if (open !== "mNouvelEmploye") return null;
  const set = (k: keyof typeof VIDE) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const n = (v: string) => Number(v.replace(/\D/g, "")) || 0;

  const etapeValide = [
    () => f.last_name.trim() && f.first_name.trim() && f.birth_date,
    () => true,
    () => true,
    () => f.hire_date && (f.contract_type !== "CDD" || f.contract_end_date),
    () => n(f.base_salary) > 0,
    () => true,
  ][etape]();

  async function creer() {
    setPending(true);
    setErreur(null);
    const res = await creerEmploye({
      ...f,
      children_count: Number(f.children_count) || 0,
      department_id: f.department_id || undefined,
      position_id: f.position_id || undefined,
      manager_id: f.manager_id || undefined,
      contract_end_date: f.contract_end_date || undefined,
      trial_end_date: f.trial_end_date || undefined,
      base_salary: n(f.base_salary),
      seniority_bonus: n(f.seniority_bonus),
      meal_allowance: n(f.meal_allowance),
      housing_allowance: n(f.housing_allowance),
      transport_allowance: n(f.transport_allowance),
      cost_of_living_allowance: n(f.cost_of_living_allowance),
    });
    setPending(false);
    if (res.ok) {
      toast(`Employé créé ✓ — matricule ${res.matricule} attribué automatiquement`);
      setF({ ...VIDE });
      setEtape(0);
      cm();
      window.location.reload();
    } else {
      setErreur(res.error);
    }
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && cm()}>
      <div className="mdl lg">
        <div className="mh">
          <div>
            <h3>Nouvel employé</h3>
            <p>Étape {etape + 1} sur 6 — {ETAPES[etape]} · le matricule sera attribué automatiquement à la création.</p>
          </div>
          <button className="x" onClick={cm}>✕</button>
        </div>
        <div className="mb">
          <div className="steps">
            {ETAPES.map((_, i) => <span key={i} className={i <= etape ? "on" : ""} />)}
          </div>

          {etape === 0 && (
            <div className="fgrid">
              <div className="fld"><label>Civilité</label><select value={f.civility} onChange={set("civility")}><option>M.</option><option>Mme</option><option>Mlle</option></select></div>
              <div className="fld"><label>Nationalité</label><input value={f.nationality} onChange={set("nationality")} /></div>
              <div className="fld"><label>Nom *</label><input value={f.last_name} onChange={set("last_name")} placeholder="EN MAJUSCULES" /></div>
              <div className="fld"><label>Prénom *</label><input value={f.first_name} onChange={set("first_name")} /></div>
              <div className="fld"><label>Date de naissance *</label><input type="date" value={f.birth_date} onChange={set("birth_date")} /></div>
              <div className="fld"><label>Lieu de naissance</label><input value={f.birth_place} onChange={set("birth_place")} placeholder="Ville" /></div>
              <div className="fld"><label>Situation matrimoniale</label><select value={f.marital_status} onChange={set("marital_status")}><option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf(ve)</option></select></div>
              <div className="fld"><label>Enfants à charge</label><input type="number" value={f.children_count} onChange={set("children_count")} /></div>
            </div>
          )}
          {etape === 1 && (
            <div className="fgrid">
              <div className="fld w"><label>Adresse</label><input value={f.address} onChange={set("address")} placeholder="Quartier, commune, ville" /></div>
              <div className="fld"><label>Téléphone</label><input className="mono" value={f.phone} onChange={set("phone")} /></div>
              <div className="fld"><label>Email</label><input type="email" value={f.email} onChange={set("email")} /></div>
              <div className="fld"><label>Contact d’urgence</label><input value={f.emergency_contact_name} onChange={set("emergency_contact_name")} /></div>
              <div className="fld"><label>Téléphone d’urgence</label><input className="mono" value={f.emergency_contact_phone} onChange={set("emergency_contact_phone")} /></div>
            </div>
          )}
          {etape === 2 && (
            <div className="fgrid">
              <div className="fld"><label>Département</label>
                <select value={f.department_id} onChange={set("department_id")}>
                  <option value="">— Aucun —</option>
                  {refs?.deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="fld"><label>Poste</label>
                <select value={f.position_id} onChange={set("position_id")}>
                  <option value="">— Aucun —</option>
                  {refs?.posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="fld"><label>Supérieur (N+1)</label>
                <select value={f.manager_id} onChange={set("manager_id")}>
                  <option value="">— Aucun —</option>
                  {refs?.managers.map((m) => <option key={m.id} value={m.id}>{m.last_name} {m.first_name} — {m.matricule}</option>)}
                </select>
              </div>
              <div className="fld"><label>Catégorie</label><select value={f.category} onChange={set("category")}><option>Employé</option><option>Cadre</option><option>Cadre Supérieur</option></select></div>
              <div className="fld"><label>N° CNSS</label><input className="mono" value={f.cnss_number} onChange={set("cnss_number")} /></div>
            </div>
          )}
          {etape === 3 && (
            <>
              <div className="fgrid">
                <div className="fld"><label>Type de contrat</label><select value={f.contract_type} onChange={set("contract_type")}><option>CDI</option><option>CDD</option></select></div>
                <div className="fld"><label>Date d’embauche *</label><input type="date" value={f.hire_date} onChange={set("hire_date")} /></div>
                {f.contract_type === "CDD" && (
                  <div className="fld"><label>Date de fin (CDD) *</label><input type="date" value={f.contract_end_date} onChange={set("contract_end_date")} /></div>
                )}
                <div className="fld"><label>Fin de période d’essai</label><input type="date" value={f.trial_end_date} onChange={set("trial_end_date")} /></div>
              </div>
              <div className="alert or" style={{ marginTop: 6 }}>
                <span className="ic">ⓘ</span>
                <div>Contrôles automatiques (contraintes SQL) : âge <b>≥ 16 ans</b>, CDD <b>≤ 24 mois</b> avec date de fin obligatoire.</div>
              </div>
            </>
          )}
          {etape === 4 && (
            <div className="fgrid">
              <div className="fld"><label>Salaire de base * (GNF)</label><input className="mono" value={f.base_salary} onChange={set("base_salary")} placeholder="2 000 000" /></div>
              <div className="fld"><label>Prime d’ancienneté</label><input className="mono" value={f.seniority_bonus} onChange={set("seniority_bonus")} /></div>
              <div className="fld"><label>Prime de repas</label><input className="mono" value={f.meal_allowance} onChange={set("meal_allowance")} /></div>
              <div className="fld"><label>Indemnité de logement</label><input className="mono" value={f.housing_allowance} onChange={set("housing_allowance")} /></div>
              <div className="fld"><label>Indemnité de transport</label><input className="mono" value={f.transport_allowance} onChange={set("transport_allowance")} /></div>
              <div className="fld"><label>Indemnité cherté de vie</label><input className="mono" value={f.cost_of_living_allowance} onChange={set("cost_of_living_allowance")} /></div>
            </div>
          )}
          {etape === 5 && (
            <div className="fgrid">
              <div className="fld"><label>Mode de paiement</label><select value={f.payment_mode} onChange={set("payment_mode")}><option>Virement</option><option>Espèces</option><option>Chèque</option></select></div>
              <div className="fld"><label>Banque</label><input value={f.bank_name} onChange={set("bank_name")} /></div>
              <div className="fld w"><label>N° de compte</label><input className="mono" value={f.bank_account} onChange={set("bank_account")} /></div>
            </div>
          )}

          {erreur && <div className="alert rg" style={{ marginTop: 10 }}><span className="ic">⚠</span><div>{erreur}</div></div>}
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={cm}>Annuler</button>
          <button className="btn btn-o" disabled={etape === 0} onClick={() => setEtape((e) => e - 1)}>← Précédent</button>
          {etape < 5 ? (
            <button className="btn btn-p" disabled={!etapeValide} onClick={() => setEtape((e) => e + 1)}>
              Suivant : {ETAPES[etape + 1]} →
            </button>
          ) : (
            <button className="btn btn-p" disabled={pending || !etapeValide} onClick={creer}>
              {pending ? "Création…" : "✓ Créer l’employé"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
