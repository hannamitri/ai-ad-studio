// Service-role Supabase client — SERVER ONLY. Bypasses RLS, so it must never be
// imported into a client component or exposed to the browser. Used by API routes
// for privileged work (creating auth users, re-parenting ads, storage writes).
// See spec/02-ARCHITECTURE.md → Security notes.
//
// NOTE: only ever import this from server-side code (route handlers / server
// components). It reads SUPABASE_SERVICE_ROLE_KEY, which must never reach the
// client bundle.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cached;
}
