"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hook générique de lecture Supabase côté client (la RLS fait autorité).
 * Vrais états de chargement/erreur — aucun tableau statique en fallback.
 */
export function useQuery<T>(
  fn: (sb: SupabaseClient) => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- déclenchement volontaire de l'état de chargement à chaque refresh
    setLoading(true);
    fn(createClient())
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refresh };
}

/** Formatage GNF : entiers, séparateur espace (3 745 000) — jamais de décimales. */
export function formatGNF(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
}

export const MOIS = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function initiales(nom: string): string {
  return nom.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
