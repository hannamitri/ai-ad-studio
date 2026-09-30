# Architecture — AI Ad Studio

## Stack

- **Next.js 15**, App Router, TypeScript, deployed on **Vercel**
- **Tailwind CSS + shadcn/ui** for components, **Framer Motion** for transitions
- **Supabase**: Postgres (data), Auth (magic link), Storage (generated images)
- **OpenAI**: Responses API — text model for the ad concept, `gpt-image-2.5-flare` for images, multi-turn for refinements
- **Upstash Redis** (or Supabase table) for rate limiting
- **PostHog** for events
- **Resend** only if you want branded magic-link emails; Supabase's default email works for v1

Create the project:

```bash
npx create-next-app@latest ai-ad-studio --typescript --tailwind --app --src-dir --eslint
cd ai-ad-studio
npx shadcn@latest init
npm i openai @supabase/supabase-js @supabase/ssr framer-motion zod posthog-js @upstash/ratelimit @upstash/redis
```

## Folder structure

```
src/
  app/
    (flow)/start/page.tsx          # guided flow; renders <FlowShell/>
    studio/page.tsx                # the bookmarkable tool
    studio/login/page.tsx          # magic-link email screen
    auth/callback/route.ts         # Supabase auth code exchange
    api/
      session/route.ts             # POST: create user from email, return session (Screen 4)
      generate/route.ts            # POST: brief -> concept -> image (streams progress events)
      refine/route.ts              # POST: instruction + adId -> new image version
      ads/route.ts                 # GET: user's ads + versions
      ads/[id]/download/route.ts   # GET: signed URL / PNG
    layout.tsx
  styles/tokens.css                # design tokens extracted from simplified.org (§3b of the PRD)
  components/
    flow/
      FrameLine.tsx                # "Your first rep as an AI Performance Marketer · Step N of 9"
      OptionCards.tsx              # Screens 4, 6, 7 multiple-choice cards (image/tag + label + feedback)
      LeverLesson.tsx              # Screen 5: the three levers revealed one at a time
      DmMessage.tsx                # Screen 3 founder message card with typing effect
      BriefBlocks.tsx              # Screen 7 assembled brief with highlighted choices
      LightLoginSheet.tsx          # Save my ad / Keep using → email bottom sheet
      FlowShell.tsx                # 14-step state machine, progress dots, transitions, history sync, localStorage persistence (incl. audience/lever/vibe)
      screens/Welcome.tsx … Payoff.tsx   (one file per screen, 9 total)
      GeneratingChecklist.tsx
    studio/
      BriefInput.tsx, ResultCard.tsx, RefineStrip.tsx, HistoryDrawer.tsx, VersionSwiper.tsx
    InstagramPost.tsx              # the preview frame (feed + story)
    BookmarkHint.tsx               # platform-aware add-to-home hint
    ui/…                           # shadcn
  lib/
    openai.ts                      # client
    concept.ts                     # brief -> AdConcept (zod-validated JSON)
    image-provider.ts              # interface { generate, refine } + OpenAI impl (+ Gemini impl later)
    payoff.ts                      # clamp + format the numbers for Screen 9
    ratelimit.ts
    supabase/{client,server,admin}.ts
    analytics.ts
    prompts/                       # copied from spec/03-PROMPTS.md as .ts constants
  types/ad.ts
scripts/generate-brief-images.ts   # one-off: makes /public/brief/*.png with the OpenAI key (never at runtime)
spec/                              # this folder
```

## Data model (Supabase / Postgres)

```sql
create table users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  source text,                       -- 'webinar' | 'call' | null
  created_at timestamptz default now()
);

create table briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  raw_text text not null,
  is_sample boolean default false,
  created_at timestamptz default now()
);

create table ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null while anonymous
  anon_id text,                                               -- set while anonymous; used to re-parent on save
  brief_id uuid references briefs(id) on delete cascade,
  concept jsonb not null,            -- AdConcept (hook, headline, primaryText, cta, imagePrompt, payoff, brand)
  choices jsonb,                     -- { audience, lever, vibe } from the guided flow (null in the studio)
  format text default 'feed',        -- 'feed' | 'story' | 'landscape'
  tone text,
  created_at timestamptz default now()
);

create table ad_versions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references ads(id) on delete cascade,
  version int not null,              -- 1 = original, 2+ = refinements
  instruction text,                  -- null for v1
  image_path text not null,          -- Supabase Storage path
  provider text not null,            -- 'openai' | 'gemini'
  provider_ref text,                 -- OpenAI response id (for multi-turn refine)
  cost_estimate_usd numeric(8,4),
  created_at timestamptz default now()
);

create table anon_usage (
  anon_id text primary key,
  ip_hash text,
  generations int default 0,
  refinements int default 0,
  first_seen timestamptz default now()
);

create table usage_daily (
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  generations int default 0,
  refinements int default 0,
  primary key (user_id, day)
);

-- RLS: users read/write only their own rows. Service role used by API routes.
```

Storage bucket `ads` (private). Serve via short-lived signed URLs; cache them client-side for the session.

## The AdConcept type

```ts
export const AdConcept = z.object({
  brand: z.object({ name: z.string(), handle: z.string(), initials: z.string() }),
  product: z.object({ name: z.string(), price: z.number(), currency: z.string().default("USD") }),
  hook: z.string().max(90),
  headline: z.string().max(40),
  primaryText: z.string().max(280),
  cta: z.enum(["Shop now","Learn more","Sign up","Get offer","Book now"]),
  imagePrompt: z.string().max(900),
  socialProof: z.object({ likes: z.number().int() }),
  payoff: z.object({
    dailyReach: z.number().int(),
    ctrPct: z.number(),
    clicks: z.number().int(),
    commissionPctLow: z.number(),
    commissionPctHigh: z.number(),
  }),
});
```

`lib/payoff.ts` clamps: `dailyReach` 500–5,000; `ctrPct` 0.8–2.5; `clicks = round(dailyReach × ctr)`; commission 10–20; `likes` 200–5,000. Compute `fiveSalesRevenue = price × 5` and commission range in code, never trust the model for arithmetic.

## API routes

### Identity model (light login)
Three states: **anonymous** (no cookie; `anon_id` = signed device cookie + IP hash used for rate limiting), **identified** (`flow_uid` cookie set after `?e=` silent creation or a Save-sheet email), **logged in** (Supabase session from the magic link). `getUserIdFromRequest()` returns the best available. Anonymous ads are stored with `user_id = null` and `anon_id`; when the visitor later saves with an email, `POST /api/session` re-parents every ad with that `anon_id` to the new user (`update ads set user_id = ... where anon_id = ...`).

### `POST /api/session`
Body `{ email, firstName?, source?, attachAnon?: boolean }`. Called silently on Screen 5 when `?e=` is present, or from the Save / Keep-using bottom sheets. Server (service role): `auth.admin.createUser` if missing → `auth.admin.generateLink({type:'magiclink'})` and send it → also mint a session for the current browser so the flow continues without waiting for the inbox (use `signInWithOtp` for the email and, for the in-flow session, `signInAnonymously` then `updateUser({ email })` — or simpler: set a signed HttpOnly cookie `flow_uid` that the generate/refine routes accept for 24h, and let the magic link be the real login). Upsert `users_profile`. Return `{ userId }`.

### `POST /api/generate`  (streams Server-Sent Events)
Body `{ briefText, choices?: { audience: string, lever: string, vibe: string }, format?, tone? }`. Store `choices` on the `ads` row (`choices jsonb`).
1. Rate-limit check: identified → `usage_daily.generations < GEN_DAILY_CAP`; anonymous → `anon_usage` by `anon_id` and by IP hash, cap `ANON_GEN_CAP` (1) / `ANON_REFINE_CAP` (2) → 429 with a friendly message.
2. Emit `step: reading`.
3. Call text model with the system prompt from `03-PROMPTS.md`, `response_format: json_schema` = AdConcept. Emit `step: angle`, then `step: copy` when the JSON arrives.
4. Emit `step: design`. Call image provider `generate({ prompt: concept.imagePrompt, size, quality })`.
5. Upload PNG to Storage, insert `briefs`, `ads`, `ad_versions(v1, provider_ref = response.id)`, increment usage.
6. Emit `done` with `{ adId, versionId, imageUrl, concept, payoff }`.
Timeout budget 45s (Vercel function `maxDuration = 60`). On failure emit `error` with a plain message and don't count usage.

### `POST /api/refine`
Body `{ adId, instruction }`. Rate-limit refinements. Load latest version's `provider_ref`. Call provider `refine({ previousRef, instruction })`. Save new version, return `{ versionId, imageUrl }`.

### `GET /api/ads`  → user's ads with versions and signed URLs.

## Image provider interface

```ts
export interface ImageProvider {
  generate(args: { prompt: string; size: "1024x1024"|"1024x1536"|"1536x1024"; quality: "low"|"medium"|"high" }): Promise<{ png: Buffer; ref: string; costEstimateUsd: number }>;
  refine(args: { previousRef: string; instruction: string }): Promise<{ png: Buffer; ref: string; costEstimateUsd: number }>;
}
```

**OpenAI implementation (Responses API):**
```ts
// generate
const r = await openai.responses.create({
  model: process.env.TEXT_MODEL!,           // the orchestrating model
  input: prompt,
  tools: [{ type: "image_generation", model: process.env.IMAGE_MODEL /* gpt-image-2.5-flare */, size, quality, output_format: "png" }],
});
const img = r.output.find(o => o.type === "image_generation_call");
// img.result is base64 PNG; keep r.id as `ref`

// refine — same call with previous_response_id: previousRef and input: instruction
```
Multi-turn via `previous_response_id` is what keeps the refinement anchored to the original creative. Store `r.id` on every version so any version can be the base for the next tweak.

Sizes: feed → `1024x1024`, story → `1024x1536`, landscape → `1536x1024`. Quality `medium` in the flow (speed), user-selectable `high` in the studio if you want a premium feel.

**Gemini implementation (fallback):** `gemini-3.1-flash-image` with `previous_interaction_id` for multi-turn. Same interface, ~US$0.067 per 1K image at list price.

## Rate limiting and cost

- `GEN_DAILY_CAP=3`, `REFINE_DAILY_CAP=6` per user, stored in `usage_daily`; plus an IP limiter (Upstash, 10 req/min) on `/api/generate` and `/api/refine` to stop scripted abuse.
- Global kill switch: `GENERATION_ENABLED=true|false` env — flip it and the flow shows "We're at capacity, your seat is saved, check your inbox" instead of failing.
- Log `cost_estimate_usd` per version from `response.usage` so you can see spend per prospect in a simple Supabase view.

## Environment variables

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TEXT_MODEL=            # current small GPT model, JSON-capable
IMAGE_MODEL=gpt-image-2.5-flare
IMAGE_PROVIDER=openai  # or gemini
GOOGLE_API_KEY=        # only if IMAGE_PROVIDER=gemini
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
GEN_DAILY_CAP=3
REFINE_DAILY_CAP=6
ANON_GEN_CAP=1
ANON_REFINE_CAP=2
GENERATION_ENABLED=true
BOOKING_URL=
PRECALL_VIDEO_URL=
FLOW_COOKIE_SECRET=
```

## Security notes

- API keys only in server routes. Never expose `OPENAI_API_KEY` or the service role key to the client.
- Validate every body with zod. Cap brief length at 3,000 chars.
- Sanitise the brief before it goes into the image prompt (strip URLs, cap length) — the copy model writes the image prompt, the raw brief never goes straight to the image model.
- Signed storage URLs, 1-hour expiry.
