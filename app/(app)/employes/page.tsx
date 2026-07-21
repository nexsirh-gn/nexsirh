"use client";

import Link from "next/link";
import { useState } from "react";
import { useModal, useToast } from "@/components/providers";
import { useQuery, formatGNF, initiales } from "@/lib/hooks";
import { DataTable, type Colonne } from "@/components/data-table";

type RapportImport = {
  total: number; valides: number; enErreur: number;
  rapport: { ligne: number; nom: string; erreurs: string[] }[];
  importes?: string[];
};

export default function Employes() {
  const { om } = useModal();
  const toast = useToast();
  const [modalImport, setModalImport] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [importPending, setImportPending] = useState(false);

  async function envoyerImport(commit: boolean) {
    if (!fichier) return;
    setImportPending(true);
    const fd = new FormData();
    fd.append("fichier", fichier);
    const res = await fetch(`/api/import/employes${commit ? "?commit=1" : ""}`, { method: "POST", body: fd });
    const json = await res.json();
    setImportPending(false);
    if (!res.ok) { toast(`Erreur : ${json.error}`); if (json.importes) setRapport({ ...(rapport ?? { total: 0, valides: 0, enErreur: 0, rapport: [] }), importes: json.importes }); return; }
    setRapport(json);
    if (commit) {
      toast(`${json.importes?.length ?? 0} salarié(s) importé(s) ✓ — matricules attribués automatiquement`);
      window.location.reload();
    }
  }

  const { data, loading, error } = useQuery(async (sb) => {
    const [emps, comps] = await Promise.all([
      sb.from("employees")
        .select("id, matricule, first_name, last_name, email, contract_type, contract_end_date, status, positions(title), departments(name)")
        .order("matricule"),
      sb.from("employee_compensation").select("employee_id, base_salary"),
    ]);
    if (emps.error) throw emps.error;
    const salaires = new Map((comps.data ?? []).map((c) => [c.employee_id, c.base_salary]));
    return (emps.data ?? []).map((e) => ({
      ...e,
      nom: `${e.last_name} ${e.first_name}`,
      poste: (e.positions as unknown as { title: string } | null)?.title ?? "—",
      departement: (e.departments as unknown as { name: string } | null)?.name ?? "—",
      salaire: salaires.get(e.id) ?? null, // null si RLS refuse (manager) — jamais de valeur inventée
    }));
  });

  if (loading) return <div className="note">Chargement des salariés…</div>;
  if (error) return <div className="alert rg"><span className="ic">⚠</span><div>Erreur : {error}</div></div>;
  const tous = data!;
  type Ligne = (typeof tous)[number];

  const filtres = [
    { id: "tous", label: "Tous", n: tous.length },
    { id: "actif", label: "Actifs", n: tous.filter((e) => e.status === "actif").length },
    { id: "cdd", label: "CDD", n: tous.filter((e) => e.contract_type === "CDD").length },
    { id: "essai", label: "En essai", n: tous.filter((e) => e.status === "essai").length },
    { id: "sorti", label: "Sortis", n: tous.filter((e) => e.status === "sorti").length },
  ];

  const colonnes: Colonne<Ligne>[] = [
    {
      id: "nom", entete: "Salarié", triPar: (e) => e.nom,
      cell: (e) => <div className="emp"><span className="av g">{initiales(e.nom)}</span><div><b>{e.nom}</b><small>{e.email}</small></div></div>,
    },
    { id: "matricule", entete: "Matricule", triPar: (e) => e.matricule, classeCell: "mono", cell: (e) => e.matricule },
    { id: "poste", entete: "Poste · Département", triPar: (e) => e.poste, cell: (e) => `${e.poste} · ${e.departement}` },
    {
      id: "contrat", entete: "Contrat", triPar: (e) => e.contract_type,
      cell: (e) => e.contract_type === "CDD" && e.contract_end_date
        ? <span className="bg bg-r">CDD — {new Date(e.contract_end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
        : e.contract_type,
    },
    { id: "salaire", entete: "Salaire de base", num: true, triPar: (e) => e.salaire, classeCell: "gnf", cell: (e) => formatGNF(e.salaire) },
    {
      id: "statut", entete: "Statut", triPar: (e) => e.status,
      cell: (e) => e.status === "actif" ? <span className="bg bg-v">Actif</span>
        : e.status === "essai" ? <span className="bg bg-o">Période d’essai</span>
        : e.status === "sorti" ? <span className="bg bg-g">Sorti</span>
        : <span className="bg bg-r">Suspendu</span>,
    },
    { id: "actions", entete: "", cell: (e) => <Link className="btn btn-g btn-sm" href={`/employes/${e.matricule.toLowerCase()}`}>Ouvrir →</Link> },
  ];

  return (
    <div>
      <DataTable
        colonnes={colonnes}
        lignes={tous}
        cle={(e) => e.id}
        recherchePar={(e) => `${e.nom} ${e.matricule} ${e.poste}`}
        placeholderRecherche="Nom, matricule, poste…"
        filtres={filtres}
        filtrePredicat={(e, f) => f === "tous" || (f === "cdd" ? e.contract_type === "CDD" : e.status === f)}
        actions={<>
          <button className="btn btn-o btn-sm" onClick={() => setModalImport(true)}>⇪ Importer Excel</button>
          <button className="btn btn-p btn-sm" onClick={() => om("mNouvelEmploye")}>+ Nouvel employé</button>
        </>}
        piedLibelle={(n) => `${n} salarié${n > 1 ? "s" : ""}`}
        messageVide="Aucun salarié ne correspond au filtre."
      />

      {/* Modale import Excel — prévisualisation puis import réel */}
      {modalImport && (
        <div className="ovl" onClick={(e) => e.target === e.currentTarget && setModalImport(false)}>
          <div className="mdl" style={{ maxWidth: 640 }}>
            <div className="mh">
              <div><h3>Importer des salariés (Excel)</h3><p>Matricules attribués automatiquement par le serveur. Aucune ligne en erreur n’est importée.</p></div>
              <button className="x" onClick={() => { setModalImport(false); setRapport(null); setFichier(null); }}>✕</button>
            </div>
            <div className="mb">
              <div className="alert vt"><span className="ic">⇩</span><div>
                <a className="link" href="/api/import/employes" download>Télécharger le modèle .xlsx</a> — remplissez-le puis chargez-le ci-dessous (dates JJ/MM/AAAA, montants en GNF entiers).
              </div></div>
              <div className="fld" style={{ marginTop: 12 }}>
                <label>Fichier .xlsx</label>
                <input type="file" accept=".xlsx" onChange={(e) => { setFichier(e.target.files?.[0] ?? null); setRapport(null); }} />
              </div>
              {rapport && (
                <div style={{ marginTop: 14 }}>
                  <div className="stat-line"><span>Lignes lues</span><b className="mono">{rapport.total}</b></div>
                  <div className="stat-line"><span>Valides</span><b className="mono" style={{ color: "var(--vert)" }}>{rapport.valides}</b></div>
                  <div className="stat-line"><span>En erreur</span><b className="mono" style={{ color: "var(--rouge)" }}>{rapport.enErreur}</b></div>
                  {rapport.rapport.filter((r) => r.erreurs.length > 0).map((r) => (
                    <div key={r.ligne} className="alert rg" style={{ marginTop: 8 }}>
                      <span className="ic">⚠</span>
                      <div><b>Ligne {r.ligne} — {r.nom}</b><br />{r.erreurs.join(" · ")}</div>
                    </div>
                  ))}
                  {rapport.enErreur === 0 && rapport.valides > 0 && (
                    <div className="alert vt" style={{ marginTop: 8 }}><span className="ic">✓</span><div>Toutes les lignes sont valides — prêt à importer.</div></div>
                  )}
                </div>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => { setModalImport(false); setRapport(null); setFichier(null); }}>Annuler</button>
              <button className="btn btn-o" disabled={!fichier || importPending} onClick={() => envoyerImport(false)}>
                {importPending ? "Analyse…" : "Prévisualiser"}
              </button>
              <button className="btn btn-p" disabled={!fichier || importPending || !rapport || rapport.valides === 0} onClick={() => envoyerImport(true)}>
                Importer {rapport ? `${rapport.valides} salarié(s)` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
