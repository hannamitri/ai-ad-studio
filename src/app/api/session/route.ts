import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getIdentity, setFlowUid } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/session — light login. See spec/02-ARCHITECTURE.md → POST /api/session.
//
// Called silently on Screen 9 when `?e=` is present, and from the Save /
// Keep-using bottom sheets (Screens 11 / 13). It:
//   1. creates-or-finds the auth user (service role),
//   2. upserts users_profile,
//   3. sends a magic link (redirect to /auth/callback) via the cookie-aware
//      client so the PKCE verifier is stored for the exchange,
//   4. sets a signed `flow_uid` cookie so the flow continues without waiting
//      for the inbox,
//   5. optionally re-parents this device's anonymous ads to the new user.
const BodySchema = z.object({
  email: z.string().trim().email().max(320),
  firstName: z.string().trim().max(120).optional(),
  source: z.enum(["webinar", "call"]).optional(),
  attachAnon: z.boolean().optional(),
});

function resolveOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const { email, firstName, source, attachAnon } = parsed.data;
  const identity = await getIdentity(request);
  const admin = createAdminClient();

  // 1. Create-or-find the auth user to get a stable userId.
  let userId: string | undefined;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: firstName ? { first_name: firstName } : {},
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    // Likely already registered — generateLink returns the existing user
    // (and does NOT send an email, so no duplicate mail).
    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    userId = link?.user?.id;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 },
    );
  }

  // 2. Upsert the profile.
  const { error: profileError } = await admin.from("users_profile").upsert(
    {
      id: userId,
      email,
      first_name: firstName ?? null,
      source: source ?? null,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return NextResponse.json(
      { error: "Could not save your profile. Please try again." },
      { status: 500 },
    );
  }

  // 3. Send the magic link via the cookie-aware client (stores the PKCE
  //    verifier so /auth/callback can exchange the code).
  const origin = resolveOrigin(request);
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=/studio`,
    },
  });

  // 4. Mint the 24h in-flow identified cookie so generate/refine accept them
  //    before the magic link is clicked.
  await setFlowUid(userId);

  // 5. Re-parent this device's anonymous ads to the new user.
  if (attachAnon && identity.anonId) {
    await admin
      .from("ads")
      .update({ user_id: userId, anon_id: null })
      .eq("anon_id", identity.anonId)
      .is("user_id", null);
  }

  return NextResponse.json({ userId });
}
