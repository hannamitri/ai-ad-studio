import { NextResponse, type NextRequest } from "next/server";
import { getIdentity } from "@/lib/auth";
import { ADS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/ads/[id]/download — the current version's PNG as an attachment.
// Ownership is checked by user_id / anon_id. Optional ?v=<n> selects a version;
// defaults to the latest. See spec/02-ARCHITECTURE.md → ads/[id]/download.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/ads/[id]/download">,
) {
  const { id } = await context.params;
  const identity = await getIdentity(request);
  const admin = createAdminClient();

  const { data: ad } = await admin
    .from("ads")
    .select("id, user_id, anon_id")
    .eq("id", id)
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

  const vParam = new URL(request.url).searchParams.get("v");
  const requested = vParam !== null ? Number(vParam) : NaN;
  let versionQuery = admin
    .from("ad_versions")
    .select("version, image_path")
    .eq("ad_id", id);
  versionQuery = Number.isFinite(requested)
    ? versionQuery.eq("version", requested)
    : versionQuery.order("version", { ascending: false }).limit(1);

  const { data: version } = await versionQuery.maybeSingle();
  if (!version?.image_path) {
    return NextResponse.json({ error: "Ad image not found." }, { status: 404 });
  }

  const { data: blob, error } = await admin.storage
    .from(ADS_BUCKET)
    .download(version.image_path);
  if (error || !blob) {
    return NextResponse.json({ error: "Could not download the image." }, { status: 500 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="ad-${id}-v${version.version}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
