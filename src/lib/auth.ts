// Identity model (light login). See spec/02-ARCHITECTURE.md → Identity model.
//
// Three states:
//   - anonymous:  no session and no flow_uid. Identified only by a signed
//                 `anon_id` device cookie (minted on first sight) used for
//                 rate limiting and to re-parent ads on save.
//   - identified: a signed `flow_uid` cookie (24h) set after silent `?e=`
//                 creation or a Save-sheet email, before the magic link is
//                 clicked.
//   - session:    a real Supabase session from the magic link (the best state).
//
// `getIdentity()` returns the best available identity and guarantees an
// `anonId` (minting + persisting one if the visitor has none yet).
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const ANON_COOKIE = "anon_id";
export const FLOW_UID_COOKIE = "flow_uid";

// ~400 days: the device stays recognisable for rate limiting across visits.
const ANON_MAX_AGE = 60 * 60 * 24 * 400;
// 24h, per the architecture: the in-flow identified session.
const FLOW_UID_MAX_AGE = 60 * 60 * 24;

export type IdentityKind = "anonymous" | "identified" | "session";

export type Identity = {
  kind: IdentityKind;
  /** Present for `identified` and `session`. */
  userId?: string;
  /** Always present — the signed device id. */
  anonId: string;
};

function secret(): string {
  const s = process.env.FLOW_COOKIE_SECRET;
  if (!s) throw new Error("FLOW_COOKIE_SECRET is not set");
  return s;
}

function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Sign a payload as `payload.signature`. */
export function sign(payload: string): string {
  return `${payload}.${hmac(payload)}`;
}

/** Verify `payload.signature` and return the payload, or null if tampered. */
export function unsign(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  if (!safeEqual(sig, hmac(payload))) return null;
  return payload;
}

// --- flow_uid (identified) ------------------------------------------------

/** Sign a `flow_uid` value with a baked-in expiry (`userId.expiryMs`). */
function signFlowUid(userId: string): string {
  const expiresAt = Date.now() + FLOW_UID_MAX_AGE * 1000;
  return sign(`${userId}.${expiresAt}`);
}

/** Return the userId from a valid, unexpired `flow_uid` cookie, else null. */
function readFlowUid(signed: string | undefined | null): string | null {
  const payload = unsign(signed);
  if (!payload) return null;
  const dot = payload.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = payload.slice(0, dot);
  const expiresAt = Number(payload.slice(dot + 1));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return userId;
}

/**
 * Set the 24h signed `flow_uid` cookie for the current response. Call from a
 * route handler (writing cookies is not allowed while rendering).
 */
export async function setFlowUid(userId: string): Promise<void> {
  const store = await cookies();
  store.set(FLOW_UID_COOKIE, signFlowUid(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FLOW_UID_MAX_AGE,
  });
}

// --- anon_id --------------------------------------------------------------

async function ensureAnonId(request: NextRequest): Promise<string> {
  const existing = unsign(request.cookies.get(ANON_COOKIE)?.value);
  if (existing) return existing;

  const anonId = randomUUID();
  // Persist on the response so the same device is recognised next time.
  const store = await cookies();
  store.set(ANON_COOKIE, sign(anonId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANON_MAX_AGE,
  });
  return anonId;
}

/**
 * Resolve the best available identity for a request, guaranteeing an `anonId`.
 * Mints + persists a signed `anon_id` cookie for first-time visitors.
 */
export async function getIdentity(request: NextRequest): Promise<Identity> {
  const anonId = await ensureAnonId(request);

  // 1. A real Supabase session always wins.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return { kind: "session", userId: user.id, anonId };
    }
  } catch {
    // Fall through to the cookie-based states.
  }

  // 2. The in-flow identified cookie.
  const flowUid = readFlowUid(request.cookies.get(FLOW_UID_COOKIE)?.value);
  if (flowUid) {
    return { kind: "identified", userId: flowUid, anonId };
  }

  // 3. Anonymous.
  return { kind: "anonymous", anonId };
}
