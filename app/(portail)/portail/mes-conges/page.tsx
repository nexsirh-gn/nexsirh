"use client";

import { useState } from "react";
import { useToast } from "@/components/providers";
import { useQuery } from "@/lib/hooks";
import { demanderConge } from "@/app/actions";
import { DataTable, type Colonne } from "@/components/data-table";

export default function MesConges() {
  const toast = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [type, setType] = useState("CA");
  const [commentaire, setCommentaire] = useState("");
  const [pending, setPending] = useState(false);

  const { data, loading, error, refresh } = useQuery(async (sb) => {
    const { data: { user } } = await sb.auth.getUser();
    const { data: profil } = await sb.from("profiles").select("employee_id").eq("id", user!.id).single();
    const [demandes, solde] = await Promise.all([
      sb.from("leave_requests").select("id, leave_type_code, start_date, end_date, working_days, status").order("created_at", { ascending: false }),
      sb.from("leave_balances").select("entitled_days, seniority_bonus_days, carryover_days, taken_days").eq("year", 2026).maybeSingle(),
    ]);
    return { demandes: demandes.data ?? [], solde: solde.data, employeeId: profil?.employee_id as string | null };
  });

  if (loading) return <div className="note">Chargement de vos congés…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const d = data!;
  const dispo = d.solde ? d.solde.entitled_days + d.solde.seniority_bonus_days + d.solde.carryover_days - d.solde.taken_days : null;

  function joursOuvrables(a: string, b: string): number {
    let n = 0;
    for (let dt = new Date(a); dt <= new Date(b); dt.setDate(dt.getDate() + 1)) {
      if (dt.getDay() !== 0 && dt.getDay() !== 6) n++;
    }
    return n;
  }

  async function envoyer() {
    if (!du || !au || !d.employeeId) { toast("Renseignez les dates."); return; }
    setPending(true);
    const res = await demanderConge({
      employeeId: d.employeeId, typeCode: type, du, au,
      jours: joursOuvrables(du, au), commentaire,
    });
    setPending(false);
    setOuvert(false);
    if (res.ok) { toast("Demande envoyée — notification au manager ✓"); refresh(); }
    else toast(`Erreur : ${res.error}`);
  }

  const STATUTS: Record<string, [string, string]> = {
    attente_manager: ["Validation manager en cours", "bg-b"],
    attente_rh: ["Validation RH en cours", "bg-o"],
    approuve: ["Approuvée", "bg-v"],
    refuse: ["Refusée", "bg-r"],
    annule: ["Annulée", "bg-g"],
  };

  type Dem = (typeof d.demandes)[number];
  const colonnes: Colonne<Dem>[] = [
    { id: "type", entete: "Type", triPar: (dem) => dem.leave_type_code, cell: (dem) => dem.leave_type_code },
    { id: "periode", entete: "Période", triPar: (dem) => dem.start_date, cell: (dem) => `${new Date(dem.start_date).toLocaleDateString("fr-FR")} – ${new Date(dem.end_date).toLocaleDateString("fr-FR")}` },
    { id: "jours", entete: "Jours", num: true, triPar: (dem) => dem.working_days, classeCell: "gnf mono", cell: (dem) => dem.working_days },
    { id: "statut", entete: "Statut", triPar: (dem) => dem.status, cell: (dem) => { const [lib, cls] = STATUTS[dem.status] ?? [dem.status, "bg-g"]; return <span className={`bg ${cls}`}>{lib}</span>; } },
  ];

  return (
    <div>
      <div className="tools">
        <span className="note">Solde disponible : <b className="mono">{dispo != null ? `${dispo.toLocaleString("fr-FR")} jours ouvrables` : "—"}</b></span>
        <span className="sp" />
        <button className="btn btn-p" onClick={() => setOuvert(true)}>+ Demander un congé</button>
      </div>
      <DataTable
        colonnes={colonnes}
        lignes={d.demandes}
        cle={(dem) => dem.id}
        piedLibelle={(n) => `${n} demande${n > 1 ? "s" : ""}`}
        messageVide="Aucune demande."
      />

      {ouvert && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setOuvert(false)}>
          <div className="mdl">
            <div className="mh">
              <div><h3>Nouvelle demande de congé</h3><p>Les jours ouvrables sont calculés automatiquement (week-ends exclus).</p></div>
              <button className="x" onClick={() => setOuvert(false)}>✕</button>
            </div>
            <div className="mb">
              <div className="fgrid">
                <div className="fld"><label>Type d’absence</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="CA">Congé annuel</option><option value="CM">Congé maladie</option>
                    <option value="CMAT">Congé maternité</option><option value="PERM">Permission exceptionnelle</option>
                  </select>
                </div>
                <div className="fld"><label>Du</label><input type="date" value={du} onChange={(e) => setDu(e.target.value)} /></div>
                <div className="fld"><label>Au (inclus)</label><input type="date" value={au} onChange={(e) => setAu(e.target.value)} /></div>
                <div className="fld w"><label>Commentaire</label><textarea rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Motif ou précision…" /></div>
              </div>
              {du && au && (
                <div className="alert vt"><span className="ic">🧮</span><div><b>{joursOuvrables(du, au)} jours ouvrables</b> décomptés. Circuit : Manager → RH.</div></div>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setOuvert(false)}>Annuler</button>
              <button className="btn btn-p" disabled={pending} onClick={envoyer}>{pending ? "Envoi…" : "Envoyer la demande"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
