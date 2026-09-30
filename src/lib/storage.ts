// Supabase Storage helpers for the private `ads` bucket. Objects live under
// {userOrAnonId}/{adId}/v{n}.png and are served via short-lived signed URLs.
// See spec/02-ARCHITECTURE.md → Storage.
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADS_BUCKET = "ads";
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export function storagePath(ownerId: string, adId: string, version: number): string {
  return `${ownerId}/${adId}/v${version}.png`;
}

export async function uploadPng(
  admin: SupabaseClient,
  path: string,
  png: Buffer,
): Promise<void> {
  const { error } = await admin.storage.from(ADS_BUCKET).upload(path, png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function signedUrl(
  admin: SupabaseClient,
  path: string,
  ttl: number = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await admin.storage
    .from(ADS_BUCKET)
    .createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) {
    throw new Error(`Could not sign URL: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}
