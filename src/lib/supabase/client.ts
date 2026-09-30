// Browser (client-component) Supabase client. Uses the public anon key only —
// never the service role key. See spec/02-ARCHITECTURE.md → Security notes.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
