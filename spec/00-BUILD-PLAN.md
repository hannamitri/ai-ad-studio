# AI Ad Studio — Build Plan

**What this is:** a mobile-first, one-screen-at-a-time web experience that takes a prospect from "I clicked a link" to "I just made my first ad with AI and I can see what it's worth" in under three minutes, then hands them a real tool they can bookmark and keep using.

**Who it's for:** prospects coming out of the Digital Marketing Simplified webinar or the booked-call funnel. They already know who you are. The job of this resource is belief, not persuasion: make them feel what it's like to be an AI Performance Marketer before they've paid for anything.

**How to use this folder in Cursor**

1. Create a new Next.js project (see `02-ARCHITECTURE.md` for the exact command and structure).
2. Drop this whole `spec/` folder into the repo root.
3. Add a `.cursor/rules/project.mdc` that says: *"Read `spec/01-PRD.md` and `spec/02-ARCHITECTURE.md` before any task. Screen copy in the PRD is final unless told otherwise. Follow the mobile UX rules in the PRD without exception."*
4. Work through the Cursor prompts in `05-CURSOR-PROMPTS.md` in order. Each prompt is one phase. Don't skip ahead — each phase is testable on its own.
5. Do the API setup in `04-INTEGRATIONS-CHECKLIST.md` in parallel (accounts, keys, env vars). Phase 3 needs the keys.

---

## The build in 7 phases

| Phase | What you're building | Done when |
|---|---|---|
| **0. Setup** | Next.js 15 (App Router) + Tailwind + shadcn/ui, deployed to Vercel with a placeholder page | You can open the Vercel URL on your phone |
| **1. Flow shell** | The step-by-step guided flow (`/start`) with all screens and copy, design tokens pulled from simplified.org, brief image cards, responsive two-column laptop layout, placeholder ad image | You can tap through all 9 screens on a phone and it feels good with no AI at all |
| **2. Auth + DB** | Supabase project, magic-link email sign-in, `users`, `ads`, `generations` tables, prefilled email from the funnel link | You can enter an email, click the link in the inbox, and land back in the flow signed in |
| **3. AI pipeline** | `/api/generate`: brief → ad concept (copy) → image. `/api/refine`: edit the existing image from a text instruction. Cost caps and rate limits | Pasting the sample brief produces a real ad in under ~25 seconds on mobile |
| **4. Payoff screens** | Instagram mockup component (HTML/CSS, real generated image + caption), the "results you can get" screen, the "5 sales" calculator, the "% of sales" reveal | The payoff screens use the user's actual ad and the brief's actual product price |
| **5. Studio (the bookmarkable tool)** | `/studio`: brief input, generate, refine chat, history of your ads, download, "add to home screen" prompt | A returning user can open `/studio`, see past ads, make new ones and refine them |
| **6. Analytics + polish** | Event tracking per screen (PostHog or Vercel Analytics), drop-off view, share/download, OG image for the link, error states, loading copy | You can see where prospects drop off; every failure state has a friendly message |

Realistic timeline with Cursor and one person: phases 0–1 in a day, 2–3 in two days, 4–5 in two days, 6 in a day. Roughly a working week to a version you'd put in front of prospects.

---

## Key decisions (already made — change them consciously)

**Image model: OpenAI `gpt-image-2.5-flare` via the Responses API, with multi-turn editing for refinements.**
Why: strongest text rendering inside images (ad creatives need legible headlines), the Responses API lets you refine the *same* image across turns by passing `previous_response_id` — which is exactly the "refine your ad" feature — and you stay on one vendor for both copy and image. `gpt-image-2.5-sunburst` is the higher-precision sibling; use it only if refinements aren't sticking close enough to the original.
Fallback / cost lever: Google `gemini-3.1-flash-image` (Nano Banana 2) is listed at about US$0.067 per 1K image with multi-turn editing too. Keep the image provider behind one interface (`lib/image-provider.ts`) so you can swap it in a day.

**Copy model: a current small GPT model (e.g. the latest `gpt-5-mini`-class model) with JSON output.** Turns the brief into a structured ad concept: hook, primary text, headline, CTA, image prompt, and the numbers for the payoff screens. Check the models page for the current name and set it in `TEXT_MODEL`.

**Auth: Supabase magic link.** One email field, no password. Email prefilled from the funnel link so most prospects tap once.

**Gate placement (light login):** no email screen before the first ad. If the funnel link carries `?e=<email>`, the account is created silently and everything is saved automatically. If not, the first generation is anonymous (device + IP rate-limited to 1 generation, 2 refinements) and the email is asked for only when they tap **Save my ad** or **Keep using the software** — as a bottom sheet, not a screen. Saving is the reason to log in, not a toll to get through.

**Cost controls:** anonymous visitors get 1 generation + 2 refinements per device/IP; identified users get 3 generations + 6 refinements per day by default (env-configurable). A generation at 1024×1024 medium quality lands roughly in the US$0.03–0.06 range on OpenAI; confirm with their calculator. At 1,000 prospects a month doing the full flow plus a couple of refinements, expect image spend in the low hundreds of dollars.

**Instagram preview is HTML/CSS, not an AI image.** You place the generated creative into a coded Instagram post frame. Crisp, instant, free, and it looks right every time.

---

## What's in this folder

- `01-PRD.md` — the product: goals, principles, every screen with its final copy, the studio, mobile rules, analytics, non-goals
- `02-ARCHITECTURE.md` — stack, folder structure, data model, API routes, image pipeline, env vars, rate limiting
- `03-PROMPTS.md` — the sample brief, the copy-model system prompt, image prompt template, refine prompt rules, the payoff-numbers logic
- `04-INTEGRATIONS-CHECKLIST.md` — every account, key and setting you need, in order
- `05-CURSOR-PROMPTS.md` — the exact prompts to paste into Cursor, phase by phase
