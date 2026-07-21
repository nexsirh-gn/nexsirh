"use client";

import { useMemo, useState, type ReactNode } from "react";

/**
 * Tableau de données réutilisable : tri (clic sur l'en-tête), recherche
 * plein-texte, filtres à puces optionnels et pagination — tout côté client,
 * sur les données déjà chargées. Fidèle aux classes des maquettes
 * (`table`, `th.num`, `.tools`, `.chip`, `.pgn`). Le rendu de chaque cellule
 * reste riche : chaque colonne fournit sa propre fonction `cell`.
 */

export type Colonne<T> = {
  /** Identifiant stable de la colonne (sert de clé de tri). */
  id: string;
  /** Libellé d'en-tête (ReactNode pour permettre une colonne vide). */
  entete: ReactNode;
  /** Rendu de la cellule (peut contenir badges, avatars, liens…). */
  cell: (ligne: T) => ReactNode;
  /** Valeur scalaire de tri. Absente = colonne non triable. */
  triPar?: (ligne: T) => string | number | null;
  /** Aligne l'en-tête et le contenu à droite (montants). */
  num?: boolean;
  /** classe(s) appliquée(s) à la cellule `td`. */
  classeCell?: string;
};

export type FiltreChip = { id: string; label: string; n?: number };

type Props<T> = {
  colonnes: Colonne<T>[];
  lignes: T[];
  cle: (ligne: T) => string;
  /** Accesseur de texte pour la recherche plein-texte. Absent = pas de recherche. */
  recherchePar?: (ligne: T) => string;
  placeholderRecherche?: string;
  /** Filtres à puces. `predicat` reçoit la ligne et l'id du filtre actif. */
  filtres?: FiltreChip[];
  filtrePredicat?: (ligne: T, filtreActif: string) => boolean;
  filtreInitial?: string;
  /** Actions affichées à droite de la barre d'outils (boutons…). */
  actions?: ReactNode;
  /** Colonnes triées par défaut. */
  triInitial?: { id: string; sens: "asc" | "desc" };
  taillePage?: number;
  /** Libellé du pied ({n} = nombre de lignes filtrées). */
  piedLibelle?: (n: number) => ReactNode;
  messageVide?: string;
  /** Titre affiché dans un `.hd` au-dessus du tableau. */
  titre?: ReactNode;
  /** Élément rendu à droite du pied (bouton d'action lié au tableau). */
  piedAction?: ReactNode;
};

export function DataTable<T>({
  colonnes, lignes, cle,
  recherchePar, placeholderRecherche = "Rechercher…",
  filtres, filtrePredicat, filtreInitial,
  actions, triInitial, taillePage = 20,
  piedLibelle, messageVide = "Aucune ligne ne correspond.",
  titre, piedAction,
}: Props<T>) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState(filtreInitial ?? filtres?.[0]?.id ?? "");
  const [tri, setTri] = useState<{ id: string; sens: "asc" | "desc" } | null>(triInitial ?? null);
  const [page, setPage] = useState(1);

  const filtrees = useMemo(() => {
    let out = lignes;
    if (filtres && filtrePredicat && filtre) out = out.filter((l) => filtrePredicat(l, filtre));
    if (recherchePar && recherche.trim()) {
      const q = recherche.toLowerCase();
      out = out.filter((l) => recherchePar(l).toLowerCase().includes(q));
    }
    if (tri) {
      const col = colonnes.find((c) => c.id === tri.id);
      if (col?.triPar) {
        const acc = col.triPar;
        out = [...out].sort((a, b) => {
          const va = acc(a), vb = acc(b);
          if (va === null || va === undefined) return 1;
          if (vb === null || vb === undefined) return -1;
          const cmp = typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "fr", { numeric: true });
          return tri.sens === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [lignes, filtres, filtrePredicat, filtre, recherchePar, recherche, tri, colonnes]);

  const nbPages = Math.max(1, Math.ceil(filtrees.length / taillePage));
  const pageSure = Math.min(page, nbPages);
  const debut = (pageSure - 1) * taillePage;
  const visibles = filtrees.slice(debut, debut + taillePage);

  function trierPar(id: string) {
    setPage(1);
    setTri((t) =>
      t?.id === id
        ? { id, sens: t.sens === "asc" ? "desc" : "asc" }
        : { id, sens: "asc" }
    );
  }

  const barreVisible = recherchePar || (filtres && filtres.length > 0) || actions;

  return (
    <div>
      {barreVisible && (
        <div className="tools">
          {recherchePar && (
            <div className="srch" style={{ width: 300 }}>
              <input
                placeholder={placeholderRecherche}
                value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
              />
            </div>
          )}
          {filtres?.map((f) => (
            <button
              key={f.id}
              className={`chip ${filtre === f.id ? "on" : ""}`}
              onClick={() => { setFiltre(f.id); setPage(1); }}
            >
              {f.label}{f.n !== undefined ? ` · ${f.n}` : ""}
            </button>
          ))}
          {actions && <><span className="sp" />{actions}</>}
        </div>
      )}
      <div className="panel">
        {titre && <div className="hd"><h3>{titre}</h3></div>}
        <table>
          <tbody>
            <tr>
              {colonnes.map((c) => {
                const triable = !!c.triPar;
                const actif = tri?.id === c.id;
                return (
                  <th
                    key={c.id}
                    className={c.num ? "num" : undefined}
                    onClick={triable ? () => trierPar(c.id) : undefined}
                    style={triable ? { cursor: "pointer", userSelect: "none" } : undefined}
                    aria-sort={actif ? (tri!.sens === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.entete}
                    {triable && (
                      <span style={{ opacity: actif ? 1 : 0.3, marginLeft: 5, fontSize: 10 }}>
                        {actif ? (tri!.sens === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
            {visibles.map((l) => (
              <tr key={cle(l)}>
                {colonnes.map((c) => (
                  <td key={c.id} className={[c.num ? "num" : "", c.classeCell ?? ""].join(" ").trim() || undefined}>
                    {c.cell(l)}
                  </td>
                ))}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={colonnes.length} className="note">{messageVide}</td></tr>
            )}
          </tbody>
        </table>
        <div className="pgn">
          <span>
            {piedLibelle
              ? piedLibelle(filtrees.length)
              : `${filtrees.length} ligne${filtrees.length > 1 ? "s" : ""}`}
          </span>
          {nbPages > 1 && (
            <div className="pgs">
              <button disabled={pageSure === 1} onClick={() => setPage(pageSure - 1)}>‹</button>
              {pagesAffichees(pageSure, nbPages).map((p, i) =>
                p === "…"
                  ? <span key={`e${i}`} style={{ padding: "0 4px" }}>…</span>
                  : <button key={p} className={p === pageSure ? "on" : ""} onClick={() => setPage(p as number)}>{p}</button>
              )}
              <button disabled={pageSure === nbPages} onClick={() => setPage(pageSure + 1)}>›</button>
            </div>
          )}
          {piedAction}
        </div>
      </div>
    </div>
  );
}

/** Fenêtre de pagination compacte : 1 … 4 5 [6] 7 8 … 20 */
function pagesAffichees(courante: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const debut = Math.max(2, courante - 1);
  const fin = Math.min(total - 1, courante + 1);
  if (debut > 2) pages.push("…");
  for (let p = debut; p <= fin; p++) pages.push(p);
  if (fin < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
