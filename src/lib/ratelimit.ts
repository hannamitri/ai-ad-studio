// Rate limiting in Postgres (no Upstash for now). Three layers, per
// spec/02-ARCHITECTURE.md → "Rate limiting and cost":
//   1. GENERATION_ENABLED kill switch → "at capacity" message.
//   2. Per-IP-hash throttle (10 req/min) via the ip_throttle table.
//   3. Usage caps: anonymous → anon_usage (ANON_GEN_CAP / ANON_REFINE_CAP),
//      identified/logged-in → usage_daily (GEN_DAILY_CAP / REFINE_DAILY_CAP).
// SERVER ONLY — uses the service-role admin client.
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Identity } from "@/lib/auth";
import { ERROR_COPY } from "@/lib/prompts";

export type RateAction = "generate" | "refine";

export type RateDecision =
  | { ok: true }
  | { ok: false; status: number; message: string; reason: "capacity" | "cap" | "throttle" };

const IP_LIMIT_PER_MINUTE = 10;

const THROTTLE_MESSAGE =
  "You're going a little fast — give it a moment and try again.";

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function caps(action: RateAction) {
  if (action === "generate") {
    return {
      anon: envInt("ANON_GEN_CAP", 1),
      daily: envInt("GEN_DAILY_CAP", 3),
    };
  }
  return {
    anon: envInt("ANON_REFINE_CAP", 2),
    daily: envInt("REFINE_DAILY_CAP", 6),
  };
}

/** Derive a stable IP hash from request headers (never store the raw IP). */
export function ipHashFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0";
  const secret = process.env.FLOW_COOKIE_SECRET ?? "";
  return createHash("sha256").update(`${ip}:${secret}`).digest("base64url");
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * Enforce the kill switch, IP throttle and usage cap. Records the IP-throttle
 * hit for every attempt (anti-abuse) but does NOT increment usage — that only
 * happens on success via {@link recordUsage}.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  {
    identity,
    action,
    ipHash,
  }: { identity: Identity; action: RateAction; ipHash: string },
): Promise<RateDecision> {
  // 1. Global kill switch.
  if (process.env.GENERATION_ENABLED === "false") {
    return { ok: false, status: 503, message: ERROR_COPY.capacity, reason: "capacity" };
  }

  // 2. Per-IP throttle (counts this attempt).
  const { data: allowed, error: throttleError } = await admin.rpc("ip_throttle_hit", {
    p_ip_hash: ipHash,
    p_limit: IP_LIMIT_PER_MINUTE,
    p_window_seconds: 60,
  });
  if (!throttleError && allowed === false) {
    return { ok: false, status: 429, message: THROTTLE_MESSAGE, reason: "throttle" };
  }

  const { anon: anonCap, daily: dailyCap } = caps(action);

  // 3. Usage caps.
  if (identity.kind === "anonymous") {
    // The visitor's own anon row.
    const { data: row } = await admin
      .from("anon_usage")
      .select("generations, refinements")
      .eq("anon_id", identity.anonId)
      .maybeSingle();
    const usedSelf =
      action === "generate"
        ? (row?.generations ?? 0)
        : (row?.refinements ?? 0);

    // Everything under this IP hash (stops cookie-clearing abuse).
    const { data: ipAgg } = await admin.rpc("anon_usage_by_ip", {
      p_ip_hash: ipHash,
    });
    const ipRow = Array.isArray(ipAgg) ? ipAgg[0] : ipAgg;
    const usedIp =
      action === "generate"
        ? Number(ipRow?.generations ?? 0)
        : Number(ipRow?.refinements ?? 0);

    if (usedSelf >= anonCap || usedIp >= anonCap) {
      return { ok: false, status: 429, message: ERROR_COPY.dailyCap, reason: "cap" };
    }
    return { ok: true };
  }

  // Identified / logged in → per-user daily cap.
  const userId = identity.userId!;
  const { data: row } = await admin
    .from("usage_daily")
    .select("generations, refinements")
    .eq("user_id", userId)
    .eq("day", today())
    .maybeSingle();
  const used =
    action === "generate"
      ? (row?.generations ?? 0)
      : (row?.refinements ?? 0);
  if (used >= dailyCap) {
    return { ok: false, status: 429, message: ERROR_COPY.dailyCap, reason: "cap" };
  }
  return { ok: true };
}

/** Increment the usage counter after a successful generation/refine. */
export async function recordUsage(
  admin: SupabaseClient,
  {
    identity,
    action,
    ipHash,
  }: { identity: Identity; action: RateAction; ipHash: string },
): Promise<void> {
  const gen = action === "generate" ? 1 : 0;
  const refine = action === "refine" ? 1 : 0;

  if (identity.kind === "anonymous") {
    await admin.rpc("increment_anon_usage", {
      p_anon_id: identity.anonId,
      p_ip_hash: ipHash,
      p_gen: gen,
      p_refine: refine,
    });
    return;
  }

  await admin.rpc("increment_usage_daily", {
    p_user_id: identity.userId!,
    p_day: today(),
    p_gen: gen,
    p_refine: refine,
  });
}
