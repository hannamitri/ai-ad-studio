import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getIdentity } from "@/lib/auth";
import { LEVER_OPTIONS, VIBE_OPTIONS } from "@/lib/brief";
import { generateConcept } from "@/lib/concept";
import {
  getImageProvider,
  sizeForFormat,
} from "@/lib/image-provider";
import { buildPayoff } from "@/lib/payoff";
import { ERROR_COPY, TONE_MAP, wrapImagePrompt } from "@/lib/prompts";
import { checkRateLimit, ipHashFromHeaders, recordUsage } from "@/lib/ratelimit";
import { signedUrl, storagePath, uploadPng } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Vercel function budget: text concept + image generation can take a while.
// See spec/02-ARCHITECTURE.md → POST /api/generate.
export const maxDuration = 60;

// POST /api/generate — brief -> concept -> image, streamed as SSE progress
// events: reading → angle → copy → design → done | error. See the architecture
// spec. Rate-limit / validation failures return JSON before the stream opens;
// generation failures emit an `error` event and do NOT count usage.
const BodySchema = z.object({
  briefText: z.string().trim().min(1).max(3000),
  choices: z
    .object({
      audience: z.string().max(64),
      lever: z.string().max(64),
      vibe: z.string().max(64),
    })
    .optional(),
  format: z.enum(["feed", "story", "landscape"]).optional(),
  tone: z.string().max(32).optional(),
});

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
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
      { error: "Please paste a brief (up to 3,000 characters)." },
      { status: 400 },
    );
  }
  const { briefText, choices, format = "feed", tone } = parsed.data;

  const identity = await getIdentity(request);
  const ipHash = ipHashFromHeaders(request.headers);
  const admin = createAdminClient();

  // Kill switch + IP throttle + usage cap (usage is NOT incremented here).
  const decision = await checkRateLimit(admin, {
    identity,
    action: "generate",
    ipHash,
  });
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.message, reason: decision.reason },
      { status: decision.status },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );

      try {
        send("step", { step: "reading" });

        // Resolve the guided-flow choices into copy + image guidance. The
        // chosen lever's headline IS the ad headline (see the prompt addendum).
        const lever = choices
          ? LEVER_OPTIONS.find((l) => l.id === choices.lever)
          : undefined;
        const vibe = choices
          ? VIBE_OPTIONS.find((v) => v.id === choices.vibe)
          : undefined;
        const conceptChoices =
          lever && vibe
            ? {
                leverHeadline: lever.headline,
                leverBriefText: lever.briefText,
                leverImageEmphasis: lever.imageEmphasis,
                vibeImageStyle: vibe.imageStyle,
              }
            : undefined;

        send("step", { step: "lever" });

        const { concept, usage: textUsage } = await generateConcept({
          briefText,
          choices: conceptChoices,
        });

        send("step", { step: "copy" });

        // The copy model wrote concept.imagePrompt; append the chosen lever's
        // image emphasis and visual style (guided flow) and any studio tone,
        // then wrap with format guidance.
        let base = concept.imagePrompt;
        if (lever) base += `\n\nEmphasis: ${lever.imageEmphasis}.`;
        if (vibe) base += `\nVisual style: ${vibe.imageStyle}.`;
        if (tone && TONE_MAP[tone]) base += `\n${TONE_MAP[tone]}.`;
        const imagePrompt = wrapImagePrompt(base, format);

        send("step", { step: "design" });

        const image = await getImageProvider().generate({
          prompt: imagePrompt,
          size: sizeForFormat(format),
          quality: "medium",
        });

        // Persist: brief -> ad -> upload -> version.
        const userId = identity.userId ?? null;
        const anonId = identity.kind === "anonymous" ? identity.anonId : null;
        const ownerId = identity.userId ?? identity.anonId;

        const { data: brief, error: briefError } = await admin
          .from("briefs")
          .insert({
            user_id: userId,
            raw_text: briefText,
            is_sample: Boolean(choices),
          })
          .select("id")
          .single();
        if (briefError || !brief) throw new Error("Could not save the brief.");

        const { data: ad, error: adError } = await admin
          .from("ads")
          .insert({
            user_id: userId,
            anon_id: anonId,
            brief_id: brief.id,
            concept,
            choices: choices ?? null,
            format,
            tone: tone ?? null,
          })
          .select("id")
          .single();
        if (adError || !ad) throw new Error("Could not save the ad.");

        const path = storagePath(ownerId, ad.id, 1);
        await uploadPng(admin, path, image.png);

        const { data: version, error: versionError } = await admin
          .from("ad_versions")
          .insert({
            ad_id: ad.id,
            version: 1,
            instruction: null,
            image_path: path,
            provider: "openai",
            provider_ref: image.ref,
            cost_estimate_usd: image.costEstimateUsd,
          })
          .select("id")
          .single();
        if (versionError || !version) throw new Error("Could not save the version.");

        const imageUrl = await signedUrl(admin, path);
        const payoff = buildPayoff(concept);

        // Count usage only now that everything succeeded.
        await recordUsage(admin, { identity, action: "generate", ipHash });

        send("done", {
          adId: ad.id,
          versionId: version.id,
          imageUrl,
          concept,
          payoff,
          // Approximate total spend (text + image) for visibility.
          costEstimateUsd:
            Math.round(
              (image.costEstimateUsd +
                (textUsage.inputTokens * 0.15) / 1_000_000 +
                (textUsage.outputTokens * 0.6) / 1_000_000) *
                10_000,
            ) / 10_000,
        });
      } catch (err) {
        console.error("[generate] failed:", err);
        send("error", { message: ERROR_COPY.generationFailed, reason: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
