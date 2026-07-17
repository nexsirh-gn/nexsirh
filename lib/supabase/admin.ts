import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service_role — UNIQUEMENT côté serveur (Server Actions / Route
 * Handlers / scripts). Jamais importé dans un composant client, jamais dans
 * le bundle (CLAUDE.md §5.3) — l'import "server-only" fait échouer le build
 * si cette règle est violée.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
