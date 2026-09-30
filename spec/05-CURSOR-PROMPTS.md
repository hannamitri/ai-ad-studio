# Cursor prompts — paste one phase at a time

Before Phase 0, add `.cursor/rules/project.mdc`:

```
---
description: AI Ad Studio project rules
alwaysApply: true
---
Read spec/01-PRD.md and spec/02-ARCHITECTURE.md before any task. Screen copy in the PRD is final unless I say otherwise. Follow the layout rules in PRD §7 exactly (phone single column 390px with fixed bottom button; laptop two-column stage; 100dvh; 16px+ inputs; AnimatePresence fade/rise transitions; reduced-motion respected). Use only the design tokens in src/styles/tokens.css (from simplified.org) — no serif fonts anywhere. One screen = one file under src/components/flow/screens. Never put API keys in client code. Validate all API bodies with zod. Prefer server components; use client components only where interaction needs them.
```

---

## Phase 0 — Setup
> Scaffold this Next.js 15 App Router project per spec/02-ARCHITECTURE.md: Tailwind, shadcn/ui (init with neutral theme), Framer Motion, the folder structure listed, an `.env.example` with every variable from the env section, and a placeholder `/start` page that renders a centred column max-w-[480px] with the text "AI Ad Studio". Add `export const maxDuration = 60` to a stub `/api/generate` route. Make it build cleanly.

## Phase 1 — Flow shell (no AI yet)
> Build the guided flow at `/start` from spec/01-PRD.md §4. Implement `FlowShell.tsx` as a step state machine (13 steps) with progress dots, Framer Motion transitions, back link, and localStorage persistence of the current step and any captured data (email, firstName from `?n=`, src from `?src=`). Create one component per screen with the exact copy from the PRD. Use a placeholder image at `/public/placeholder-ad.png` for the generated creative. Screens 4–6 are multiple-choice option cards whose answers assemble the brief via buildBrief() from spec/03-PROMPTS.md; Screen 7's copy button copies that brief and enable the primary button only after copying (with the clipboard-failure fallback described). Screen 10 should render the four-step checklist and tick through it on a fake 12-second timer for now. Screen 13 must reveal beats A, B, C on successive taps with the count-up animation, using hardcoded numbers from the payoff example ($198 product). Build `InstagramPost.tsx` per PRD §6 and `BookmarkHint.tsx` with platform detection. Everything mobile-first per PRD §7.

Then test on your phone via the Vercel preview URL before moving on.

## Phase 2 — Auth + database
> Set up Supabase per spec/02-ARCHITECTURE.md: `lib/supabase/{client,server,admin}.ts` using @supabase/ssr, the `/auth/callback` route, and a SQL migration file `supabase/migrations/001_init.sql` containing the schema and owner-only RLS policies. Implement `POST /api/session`: given `{email, firstName, source}` create-or-find the auth user, upsert users_profile, send a magic link, and set a signed HttpOnly `flow_uid` cookie (24h, using FLOW_COOKIE_SECRET) so the flow can continue immediately. Write `lib/auth.ts` with `getUserIdFromRequest()` that accepts either a Supabase session or a valid flow_uid cookie. Wire Screen 4 to call `/api/session`. Build `/studio/login` (email → magic link) and make `/studio` redirect there when there is no session.

## Phase 3 — AI pipeline
> Implement the AI pipeline from spec/02-ARCHITECTURE.md and spec/03-PROMPTS.md. Create `src/lib/prompts/` with the system prompt, image wrapper, refine prefix and tone map as constants. Create `types/ad.ts` with the AdConcept zod schema. Implement `lib/concept.ts` (text model call with JSON schema output, zod validation, one retry on failure). Implement `lib/image-provider.ts` with the interface and the OpenAI Responses API implementation using the `image_generation` tool, `IMAGE_MODEL` from env, and `previous_response_id` for `refine`. Implement `lib/payoff.ts` exactly as specified. Implement `POST /api/generate` as an SSE stream emitting `reading → angle → copy → design → done|error`, with usage_daily rate limiting, IP rate limiting via Upstash, upload to the `ads` storage bucket, and inserts into briefs/ads/ad_versions. Implement `POST /api/refine` and `GET /api/ads`. Wire Screen 5 → 6 → 7 to the real stream: the checklist ticks on real events, and Screen 7 shows the real image, headline and primary text. Wire the "Tweak it" bottom sheet to `/api/refine`.

## Phase 4 — Payoff screens on real data
> Replace the hardcoded numbers in Screen 8 and Screen 9 with the concept and payoff returned by `/api/generate`. Screen 8's InstagramPost must use brand name/handle/initials, the generated image, primaryText as caption, the cta, and socialProof.likes. Screen 9 Beat A uses reach/ctr/clicks, Beat B uses product.price × 5 with the currency, Beat C uses cutLow–cutHigh. Buttons on Beat C read BOOKING_URL / PRECALL_VIDEO_URL based on `src`. Add "Download my ad" via `/api/ads/[id]/download`.

## Phase 5 — Studio
> Build `/studio` per spec/01-PRD.md §5: BriefInput with Format and Tone chips, ResultCard with copy-to-clipboard on each copy field, RefineStrip with the four suggestion chips (behaviour in spec/03-PROMPTS.md) and a VersionSwiper across ad_versions, HistoryDrawer listing past ads grouped by brief with signed thumbnails, Preview on Instagram (reuse InstagramPost), Download PNG, Start again. Show the daily-cap message from spec/03-PROMPTS.md when `/api/generate` returns 429. Show the BookmarkHint once per device on first visit.

## Phase 6 — Analytics and polish
> Add PostHog with the events named in spec/01-PRD.md §4 and §8 (properties: src, step, duration_ms, user_id). Add every error state and its copy from spec/03-PROMPTS.md. Add the GENERATION_ENABLED kill switch behaviour. Add OG metadata for `/start` ("Make your first AI ad in 3 minutes"). Add a blurred placeholder while the creative loads. Run Lighthouse on mobile and fix anything under 90 for performance and accessibility. Write a short README with the local setup steps.

---

## Prompts you'll want later

**Swap to Gemini:** "Add a `GeminiImageProvider` to lib/image-provider.ts implementing the same interface using `gemini-3.1-flash-image` with `previous_interaction_id` for refine, selected when IMAGE_PROVIDER=gemini."

**Product photo upload (v2):** "Add an optional image upload to BriefInput; pass it as an input image to the image_generation tool so the creative features the real product."

**Admin view:** "Add `/admin` (protected by an ALLOWED_ADMIN_EMAILS env list) showing daily generations, refinements, failure rate, estimated spend, and the funnel completion counts."
