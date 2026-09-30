import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth";
import { getImageProvider } from "@/lib/image-provider";
import { checkRefineGuardrails, refinePrompt } from "@/lib/prompts";
import { checkRateLimit, ipHashFromHeaders, recordUsage } from "@/lib/ratelimit";
import { signedUrl, storagePath, uploadPng } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/refine — instruction + adId -> a new ad_version, anchored to the
// original creative via previous_response_id. See spec/02-ARCHITECTURE.md and
// spec/03-PROMPTS.md → "Refine prompt".
const BodySchema = z.object({
  adId: z.string().uuid(),
  instruction: z.string().trim().min(1).max(200),
});

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
      { error: "Tell it what to change (up to 200 characters)." },
      { status: 400 },
    );
  }
  const { adId, instruction } = parsed.data;

  // Guardrails: blocked terms / URLs (see spec/03-PROMPTS.md).
  const blocked = checkRefineGuardrails(instruction);
  if (blocked) {
    return NextResponse.json({ error: blocked, reason: "blocked" }, { status: 400 });
  }

  const identity = await getIdentity(request);
  const ipHash = ipHashFromHeaders(request.headers);
  const admin = createAdminClient();

  const decision = await checkRateLimit(admin, {
    identity,
    action: "refine",
    ipHash,
  });
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.message, reason: decision.reason },
      { status: decision.status },
    );
  }

  // Load the ad and check ownership (by user_id or anon_id).
  const { data: ad } = await admin
    .from("ads")
    .select("id, user_id, anon_id")
    .eq("id", adId)
    .maybeSingle();
  if (!ad) {
    return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  }
  const owns =
    (ad.user_id && ad.user_id === identity.userId) ||
    (ad.anon_id && ad.anon_id === identity.anonId);
  if (!owns) {
    return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  }
  const ownerId: string = ad.user_id ?? ad.anon_id;

  // Latest version → its provider_ref is the base for this tweak.
  const { data: latest } = await admin
    .from("ad_versions")
    .select("version, provider_ref")
    .eq("ad_id", adId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.provider_ref) {
    return NextResponse.json(
      { error: "This ad can't be refined." },
      { status: 400 },
    );
  }

  try {
    const image = await getImageProvider().refine({
      previousRef: latest.provider_ref,
      instruction: refinePrompt(instruction),
    });

    const nextVersion = latest.version + 1;
    const path = storagePath(ownerId, adId, nextVersion);
    await uploadPng(admin, path, image.png);

    const { data: version, error: versionError } = await admin
      .from("ad_versions")
      .insert({
        ad_id: adId,
        version: nextVersion,
        instruction,
        image_path: path,
        provider: "openai",
        provider_ref: image.ref,
        cost_estimate_usd: image.costEstimateUsd,
      })
      .select("id")
      .single();
    if (versionError || !version) throw new Error("Could not save the version.");

    const imageUrl = await signedUrl(admin, path);

    // Count usage only after success.
    await recordUsage(admin, { identity, action: "refine", ipHash });

    return NextResponse.json({ versionId: version.id, imageUrl, version: nextVersion });
  } catch (err) {
    console.error("[refine] failed:", err);
    return NextResponse.json(
      { error: "That tweak didn't come out. Try again — it won't count.", reason: "failed" },
      { status: 500 },
    );
  }
}
