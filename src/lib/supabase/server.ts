// Server (SSR) Supabase client, cookie-aware via `next/headers`. Uses the public
// anon key and reads/writes the auth session from the request cookies so magic
// links (PKCE) and sessions work across route handlers, server components and
// server actions. See spec/02-ARCHITECTURE.md.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` can be called from a Server Component where writing
            // cookies is not allowed. That's fine — the session is refreshed
            // by route handlers / middleware, so we can safely ignore it here.
          }
        },
      },
    },
  );
}
