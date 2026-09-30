import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase auth code exchange. The magic link points here with a `?code=`
// (PKCE). We exchange it for a session (cookies are written by the SSR client)
// and redirect into the studio. See spec/02-ARCHITECTURE.md → auth/callback.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to go after a successful login (defaults to the studio).
  const next = searchParams.get("next") ?? "/studio";
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/studio`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // Bad or missing code — send them to the login screen with an error flag.
  return NextResponse.redirect(`${origin}/studio/login?error=auth`);
}
