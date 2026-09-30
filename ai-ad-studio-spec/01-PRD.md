# PRD — AI Ad Studio (guided flow + bookmarkable tool)

## 1. Goal

Give a prospect a real, felt win in under three minutes: they paste a client brief, an ad appears with their name on it, they see it live in an Instagram frame, and they see what that ad is worth in money. Then leave them holding a tool they can keep using. The outcome we want in their head when they close the tab: *"I can actually do this."*

Success metrics (track from day one):
- Flow completion rate: % of people who open `/start` and reach the payoff screen
- Time to first ad: target under 3 minutes median on mobile
- Return rate: % who open `/studio` again within 7 days
- Downstream: booked-call show rate and close rate for prospects who completed the flow vs. those who didn't

## 2. Audience and context

They arrive from the webinar or from the post-booking sequence. They've heard the "AI Performance Marketer" framing. Many are on their phone. Many have never touched an ads tool. Assume zero prior knowledge and a short attention span, and assume they are a little unsure of themselves — the whole experience is built to remove that.

## 3. Design principles (non-negotiable)

1. **One thing per screen.** One idea, one piece of copy, one action. If a screen needs a scrollbar on an iPhone SE, it has too much on it.
2. **The screen guides, the user follows.** Every screen tells them exactly what to do next in one sentence. The primary button is always visible without scrolling.
3. **Never make them think about the tool.** No settings, no model choices, no sliders in the guided flow. Those live in the studio, and even there they're optional.
4. **Momentum.** Transitions are quick (200–300ms slide/fade), progress dots show how close they are, and the "waiting" state teaches them something instead of showing a spinner.
5. **Plain, warm, cause-and-effect copy.** Conversational. Explain *why* at each step in one line. No hype adjectives stacked on top of each other, no fear framing ("don't get left behind"), no rhetorical fragments ("This isn't a course. This is a career."). Never use the word "quietly".
6. **Real numbers, honestly labelled.** The payoff screens use the actual price from the brief and clearly say "illustrative" where they are.
7. **Mobile first, desktop fine.** Design at 390px wide. Desktop centres the same column at max 480px.

## 4. The guided flow (`/start`)

Nine screens. Each has: a headline, one supporting line, an optional visual, and one primary button. Progress dots at the top (9). Back is a small text link, never a big button.

Entry URL: `https://<domain>/start?e=<email>&src=<webinar|call>&n=<firstname>`
All params optional. `e` prefills the email field. `n` personalises headlines ("Nice one, Sarah").

### Screen 1 — Welcome
**Headline:** This is the first step to becoming an AI Performance Marketer.
**Body:** In the next couple of minutes you're going to make a real ad, for a real kind of brief, with the same tools working marketers use every day. No experience needed. The screen will walk you through it.
**Button:** Let's go
**Visual:** subtle looping animation of three ad creatives fanning out (pre-rendered, not AI-generated live).
**Event:** `flow_started`

### Screen 2 — The brief
**Headline:** Here's the kind of brief a client sends you.
**Body:** This is what the work actually looks like. A brand tells you who they are, what they sell, and who they want to reach. Your job is to turn that into an ad that makes people stop and click.
**Visual:** a card styled like an email/Notion doc containing the sample brief (see `03-PROMPTS.md` → Sample brief). Scrollable inside the card if needed, but the card itself fits the viewport.
**Button:** Makes sense
**Event:** `brief_viewed`

### Screen 3 — Copy the brief
**Headline:** Copy this brief. You'll paste it into the software on the next screen.
**Body:** That's the whole first move a marketer makes: take the brief and hand it to the tools.
**Visual:** the brief text in a code-style box with a large **Copy brief** button. On tap: copies to clipboard, button changes to "Copied ✓", and the primary button becomes enabled.
**Button:** Take me to the software → (disabled until copied; on iOS if clipboard fails, fall back to auto-filling the brief on the next screen and still let them through)
**Event:** `brief_copied`

### Screen 4 — Save your seat (email)
**Headline:** Where should we save your ad?
**Body:** Pop your email in and we'll save everything you make so you can come back to it. One tap if it's already filled in.
**Field:** email (prefilled from `?e=`).
**Button:** Save and continue
**Behaviour:** Creates the user (Supabase `signInWithOtp` with `shouldCreateUser: true`). Do **not** block on the magic link — issue an anonymous-to-email session so the flow continues immediately; the magic link in their inbox is how they get back into `/studio` later. Show a tiny line under the button: "We've sent a link to your inbox — that's your key back into the software later."
**Event:** `email_captured`

### Screen 5 — The software (bookmark moment)
**Headline:** This is the actual software. Bookmark it — you can use it on real brands.
**Body:** Paste the brief below and tap Generate. This is the same screen you'll come back to later.
**Visual:** the studio input (a textarea, prefilled if clipboard failed earlier), a small bookmark hint bar: on iOS "Tap Share → Add to Home Screen", on Android "Tap ⋮ → Add to Home screen", on desktop "Press ⌘D / Ctrl+D". Detect platform and show only the relevant one. Dismissible.
**Button:** Generate my ad
**Event:** `generate_requested`

### Screen 6 — Generating (the teaching pause)
Full-screen, 15–30 seconds. No raw spinner. A vertical checklist that ticks as the pipeline progresses (driven by real server events, not a timer):
1. Reading the brief…
2. Finding the angle → *"Working marketers call this the hook. It's the reason someone stops scrolling."*
3. Writing the copy → *"Headline, primary text, call to action."*
4. Designing the creative → *"This is the part that used to take a designer a day."*
Each step shows its one-line explainer as it becomes active. Below: "Usually about 20 seconds."
**Event:** `generation_started`, `generation_completed` (with duration) or `generation_failed`

### Screen 7 — Your first ad
**Headline:** You just made your first ad, {firstname}.
**Body:** Brief in, ad out. This is the core loop of performance marketing, and you've now done it once. Everything after this is doing it better and doing it for money.
**Visual:** the generated creative, full width, with the headline and primary text below it as plain text.
**Buttons:** primary **See it on Instagram**; secondary text link "Tweak it" (opens a bottom sheet with a single instruction box: "Make the background darker", "Change the headline to…", 6 refinements/day) — refinement regenerates the image in place and then returns them here.
**Event:** `ad_viewed`, `refine_requested`

### Screen 8 — Live on Instagram
**Headline:** Here's how it looks in the feed.
**Body:** Same ad, real context. This is what a stranger scrolling at 9pm would see.
**Visual:** the Instagram post component (see §6) — brand avatar and name from the brief, "Sponsored" label, the creative, the generated primary text as the caption, a "Shop now" CTA bar. Optional toggle: Feed / Story (Story reuses the image at 9:16 by letterboxing on a blurred copy of itself).
**Button:** What could this ad do?
**Event:** `instagram_preview_viewed`

### Screen 9 — What it's worth
Three beats on one screen, revealed one after another as they tap (each tap reveals the next block; the button label changes). Nothing else on the screen.

**Beat A — results you can get.** Headline: *An ad like this, with a modest budget, can realistically get:* then three big numbers with labels — e.g. **1,200 people** reached per day, **1.5%** click-through, **18 clicks** to the site — and one line: "Illustrative numbers based on typical benchmarks for this kind of product; real results depend on budget, audience and testing."
Button: **And if it made 5 sales?**

**Beat B — 5 sales.** The product price from the brief × 5, animated count-up. E.g. **5 sales × $89 = $445** in revenue for the brand, from one ad, from one brief. Line: "Now imagine that ad running every day."
Button: **What does the marketer get?**

**Beat C — the marketer's cut.** Headline: *The best performance marketers get paid a percentage of the sales they generate.* Body: "A common arrangement is 10–20% of revenue on top of a retainer. On the numbers above that's **$45–$89** back to you from five sales. Marketers on our program have gone on to run ads doing hundreds of sales a month — that's the maths you're now part of."
Then the close:
**Headline:** You've done the first rep. The program is where you do the next thousand.
**Buttons:** primary — depends on `src`: if `call`, **I'm ready for my call** (deep link to the booking confirmation / pre-call video); if `webinar`, **Book my call** (booking link). Secondary: **Keep using the software** → `/studio`. Tertiary text link: **Download my ad**.
**Event:** `payoff_a`, `payoff_b`, `payoff_c`, `cta_clicked` (with which)

Numbers in Beats A–C come from the copy model's structured output (see `03-PROMPTS.md` → payoff numbers), which reads the price and category from the brief and returns benchmark-range figures. Hard-clamp them server-side to sensible ranges so the model can never show a silly number.

## 5. The studio (`/studio`) — the bookmarkable tool

This is what they keep. It must work well enough on real brands that a graduate could use it in week one of a job.

Layout (mobile): a single column.
- **Top bar:** logo, "My ads" (history drawer), account (email, sign out).
- **Brief box:** large textarea, placeholder "Paste a client brief, or describe the brand, product, price and audience." Below it two optional chips: *Format* (Feed 1:1 default · Story 9:16 · Landscape 1.91:1) and *Tone* (Bold · Clean · Playful · Premium). Nothing else.
- **Generate** button.
- **Result card:** creative + copy block (hook, headline, primary text, CTA) each with a copy-to-clipboard icon.
- **Refine strip** under the result: a chat-style input, "Tell it what to change", with 4 suggestion chips (*Brighter*, *Different headline*, *Show the product bigger*, *Make it more premium*). Each refinement appends a new version; the user can swipe between versions.
- **Actions:** Preview on Instagram (same component), Download PNG, Save copy as text, Start again.
- **History drawer:** thumbnails of past ads grouped by brief; tap to reopen with all versions.

Limits and messaging: when a user hits the daily cap, show a warm message ("You've used today's free generations — they reset at midnight. Your saved ads are all still here.") with a secondary CTA to the program page. Configurable via env.

First visit to `/studio` from a bookmark with no session: a single email screen ("Enter the email you used and we'll send you a link") — magic link — then straight in.

## 6. Instagram preview component

Pure HTML/CSS/Tailwind, no external images. Props: `brandName`, `brandInitials` (avatar fallback), `creativeUrl`, `caption`, `ctaLabel`, `format`.
- Header: 32px circular avatar (gradient ring), brand name bold, "Sponsored" beneath in grey, ⋯ on the right.
- Media: the creative at the chosen ratio.
- CTA bar: light grey bar with `ctaLabel` and a chevron (Instagram's ad CTA pattern).
- Action row: heart, comment, share icons left; bookmark right. Use inline SVG line icons of your own — don't copy Instagram's exact glyphs.
- Likes line: "1,284 likes" (static, from the copy model's `socialProof` field, clamped).
- Caption: `brandName` bold + caption text, truncated to 2 lines with "…more".
Dark-mode aware.

## 7. Mobile UX rules for Cursor

- Design width 390px; test at 375px and 430px. Desktop: same column, `max-w-[480px]`, centred, soft background.
- Primary button: fixed to the bottom of the viewport on mobile with safe-area padding, full width, 56px tall.
- `100dvh`, not `100vh`. Account for the iOS URL bar.
- Transitions: Framer Motion, slide 24px + fade, 220ms. Respect `prefers-reduced-motion`.
- Progress dots: 9, top centre, 6px, current dot elongated.
- Tap targets ≥ 44px. Font size ≥ 16px in inputs (prevents iOS zoom).
- Images: `next/image`, generated creative served from Supabase Storage with a blurred placeholder.
- Copy-to-clipboard: `navigator.clipboard.writeText` with a `textarea.select()` fallback.
- No modals in the guided flow. Bottom sheets only.
- Persist flow position in `localStorage` so a refresh returns them to the same screen.
- Every network action has an inline error state with a retry, worded plainly ("That didn't go through — tap to try again").

## 8. Analytics

Event per screen (names above) with properties `src`, `step`, `duration_ms`, `user_id`. Funnel view: Screen 1 → 9 drop-off. Alert if generation failure rate > 5% in an hour. PostHog (free tier is enough) or Vercel Analytics custom events.

## 9. Non-goals for v1

- No account passwords, profiles or teams.
- No video ads.
- No brand-asset upload (logo/product photo) — v2 candidate, and a strong one: `gpt-image-2.5` takes reference images, so "upload your product photo" becomes a natural studio upgrade.
- No ad publishing to Meta. The Instagram frame is a preview.
- No multi-language.

## 10. Open questions for Nick

- Booking link and pre-call video URL for Screen 9 CTAs.
- Brand name for the tool (working name: **AI Ad Studio**). It should feel like a product they'd want on their home screen.
- Do you want the sample brief to be a fictional brand (safe, recommended) or a real partner brand from your internship network (more believable, needs permission)?
- Daily caps: 3 generations / 6 refinements to start?
