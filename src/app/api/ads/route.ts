import { NextResponse, type NextRequest } from "next/server";
import { getIdentity } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/ads — the current identity's ads with versions and signed URLs.
// See spec/02-ARCHITECTURE.md → GET /api/ads.
type VersionRow = {
  id: string;
  version: number;
  instruction: string | null;
  image_path: string;
  cost_estimate_usd: number | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const identity = await getIdentity(request);
  const admin = createAdminClient();

  let query = admin
    .from("ads")
    .select(
      "id, concept, choices, format, tone, created_at, brief_id, briefs(raw_text), ad_versions(id, version, instruction, image_path, cost_estimate_usd, created_at)",
    )
    .order("created_at", { ascending: false });

  query =
    identity.kind === "anonymous"
      ? query.eq("anon_id", identity.anonId)
      : query.eq("user_id", identity.userId!);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load your ads." }, { status: 500 });
  }

  const ads = await Promise.all(
    (data ?? []).map(async (ad) => {
      const versions = ((ad.ad_versions as VersionRow[]) ?? []).sort(
        (a, b) => a.version - b.version,
      );
      const withUrls = await Promise.all(
        versions.map(async (v) => ({
          id: v.id,
          version: v.version,
          instruction: v.instruction,
          costEstimateUsd: v.cost_estimate_usd,
          createdAt: v.created_at,
          imageUrl: await signedUrl(admin, v.image_path).catch(() => null),
        })),
      );
      const brief = ad.briefs as unknown as { raw_text: string } | null;
      return {
        id: ad.id,
        briefId: ad.brief_id,
        briefText: brief?.raw_text ?? null,
        concept: ad.concept,
        choices: ad.choices,
        format: ad.format,
        tone: ad.tone,
        createdAt: ad.created_at,
        versions: withUrls,
      };
    }),
  );

  return NextResponse.json({ ads });
}
