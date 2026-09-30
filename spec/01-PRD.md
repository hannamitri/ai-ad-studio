# PRD — AI Ad Studio (guided flow + bookmarkable tool)

## 1. Goal

Give a prospect a real, felt win in under three minutes: they paste a client brief, an ad appears with their name on it, they see it live in an Instagram frame, and they see what that ad is worth in money. Then leave them holding a tool they can keep using. The outcome we want in their head when they close the tab: *"I can actually do this."*

Success metrics (track from day one):
- Flow completion rate: % of people who open `/start` and reach the payoff screen (and per-question drop-off on Screens 5–8)
- Time to first ad: target under 3 minutes median on mobile
- Return rate: % who open `/studio` again within 7 days
- Downstream: booked-call show rate and close rate for prospects who completed the flow vs. those who didn't

## 2. Audience and context

They arrive from the webinar or from the post-booking sequence. They've heard the "AI Performance Marketer" framing. Many are on their phone. Many have never touched an ads tool. Assume zero prior knowledge and a short attention span, and assume they are a little unsure of themselves — the whole experience is built to remove that.

## 3. Design principles (non-negotiable)

1. **One thing per screen.** One idea, one piece of copy, one action. If a screen needs a scrollbar on an iPhone SE, it has too much on it.
2. **The screen guides, the user follows.** Every screen tells them exactly what to do next in one sentence. The primary button is always visible without scrolling.
3. **Never make them think about the tool.** No settings, no model choices, no sliders in the guided flow. Those live in the studio, and even there they're optional.
4. **Momentum.** Transitions are calm and directional: the outgoing screen fades out (180ms), the incoming screen fades in and rises 12px (320ms, ease-out), with the headline, body and visual staggered by 60ms so the screen assembles itself top to bottom. Never a hard cut. Back reverses the direction. Progress dots show how close they are, and the "waiting" state teaches them something instead of showing a spinner.
5. **Plain, warm, cause-and-effect copy.** Conversational. Explain *why* at each step in one line. No hype adjectives stacked on top of each other, no fear framing ("don't get left behind"), no rhetorical fragments ("This isn't a course. This is a career."). Never use the word "quietly".
6. **Real numbers, honestly labelled.** The payoff screens use the actual price from the brief and clearly say "illustrative" where they are.
7. **Show, don't list.** Information arrives as pictures and short labelled cards, one at a time, never as paragraphs. If a fact can be an image with a five-word caption, it is.
8. **The dream outcome is always on screen.** A persistent, quiet frame line above every screen reads *Your first rep as an AI Performance Marketer · Step N of 15*. Every screen's copy connects what they're doing to who they're becoming, in one clause, not a lecture.
9. **Looks like Simplified.** Same fonts, colours, radii and button style as simplified.org (see §3b). Sans-serif everywhere. No serif fonts anywhere in the app.
10. **Responsive, not just mobile.** Phone gets a single narrow column. Laptop gets a wide, two-column stage that uses the screen (see §7). Same content, different composition.

## 3b. Design system — match simplified.org

Cursor extracts these from the live site rather than guessing: fetch `https://www.simplified.org/`, follow its stylesheet links, and pull the `font-family` declarations (and any `@font-face` / Google Fonts `<link>`), the CSS colour variables or the most-used colours (background, text, primary button, accent), the button `border-radius`, and card radius/shadow. Write them to `src/styles/tokens.css` as CSS variables and wire them into Tailwind (`@theme` in `globals.css` for Tailwind v4) so the whole app uses them. Known from a visual read of the site: light background, dark text, warm orange primary buttons with rounded corners, dark-blue and purple secondary accents, card-based layouts with generous whitespace, all sans-serif. If the site's fonts can't be loaded (licensing), use Inter as the closest free stand-in and note it.

Rules: headings bold sans-serif, tight letter-spacing; body 16–18px regular; primary button = site's orange, full-width on mobile, auto-width on desktop, 56px tall, site's radius; cards white on the soft background with the site's radius and a soft shadow; icons lucide-react at 1.5px stroke.

## 4. The guided flow (`/start`)

Fifteen screens, each a five-second tap. The prospect *earns* the ad: they meet the client, see the goal, get hired, learn one real lesson about attention, make three marketer's decisions, and those decisions become the brief and shape the ad. Each screen has: the frame line (§3 point 8, "Step N of 15"), a headline, one supporting line, a visual, and one primary button. Progress dots at the top (15, small). Back is a small text link and always works (real state change + browser history sync).

Entry URL: `https://<domain>/start?e=<email>&src=<webinar|call>&n=<firstname>`
All params optional. `e` identifies them silently (see Screen 13); `n` personalises headlines.

**The client is Alto** — a Portland company making one home espresso machine, $249. Chosen because everyone has an opinion about coffee, the "$5 a day" buyer is an obvious audience lesson, and the payoff maths is strong (5 sales = $1,245; marketer's cut $125–$249). Brand data lives in `03-PROMPTS.md`.

**State captured:** `audience` (Q1 choice + whether it was the recommended one), `lever` (Q2: pain | desire | speed — this is the hook), `vibe` (Q3). These assemble the brief and are passed to `/api/generate` so the ad reflects them. The prospect's picks are never called "right" or "all fine" — they are treated as judgement calls with reasons, and the ad visibly honours them.

**Imagery.** Pre-generated once by `scripts/generate-brief-images.ts` into `/public/brief/` (prompts in `03-PROMPTS.md`). Never generated at runtime.

### Screen 1 — Welcome
**Headline:** This is the first step to becoming an AI Performance Marketer.
**Body:** In the next few minutes you'll take a real client brief, make the calls a marketer makes, and ship a real ad — with the same tools working marketers use every day. No experience needed.
**Visual:** three ad creatives fanning out, pre-rendered, brand palette.
**Button:** Let's go
**Event:** `flow_started`

### Screen 2 — Meet the client
**Headline:** Meet Alto Espresso.
**Body:** A premium-grade coffee brand looking to expand.
**Visual:** `brand.png` (the machine on a kitchen bench in morning light) with a **$249** pill; beneath the image a row of small accent call-out bubbles (Luxury · Premium · Coffee Lovers) and one line: "A small Portland company that makes one thing: a home espresso machine that pulls café-quality shots. $249." Brand and product only — one idea per frame (§3 point 1); the goal gets its own screen next.
**Button:** So what do they need?
**Event:** `client_viewed`

### Screen 3 — The goal
**Headline:** Here's the goal.
**Body:** Alto wants $50,000 in online sales every month. That's where you come in.
**Visual:** a single goal card that counts up: **$50,000 / month** in online sales → **≈ 200 machines a month**. One line: "They can't get there without ads that convert."
**Button:** So where do I come in?
**Event:** `goal_viewed`

**Phone only.** Screens 1–2 already introduced the brand, and more copy here drops people before they reach the money. On a phone, hide the headline, body and goal card. Show the commission calculator instead. It opens with *If the ad you generated makes:* then the cut at a flat **3% of monthly ad spend** ($30k–$70k slider, default $50k → **$1,500 / month**). The whole slider stays in the $1–2k range. Small line under the slider: "About 3% of the ad spend you manage. One decent ad is usually $1–2k a month." In the space under the card, the "People who started where you are" quotes (name · time in · base + share) and "The best part is, these roles come with a base level of pay, so you're never worried about your next paycheck." Laptop keeps the goal card above, unchanged.

### Screen 4 — You've been hired
**Headline:** They've hired you.
**Body:** This is what the first message from a client looks like.
**Visual:** DM-style message card (avatar initials "AL", name "Marcus · Founder, Alto", timestamp "just now"): *"Hey {firstname} — we're looking for someone to run the ads for the Alto machine. $10k a month base, plus 10% of every sale you bring in. Can you take it?"* The money line stays bold. When no first name is available, the greeting is *"Hey — we're looking for…"* (no "there"). Types in over ~1.2s.
**Button:** I'm in
**Event:** `hired_viewed`

### Screen 5 — Q1: Who is this ad for?
**Headline:** First call: who is this ad for?
**Body:** A $249 machine isn't for everyone, and pretending it is wastes the client's money. Ads get cheaper the more precisely you aim.
**Visual:** three tappable picture cards:
- A — `aud-everyone.png` — **Anyone who drinks coffee**
- B — `aud-cafe.png` — **People spending $5+ a day at cafés who own good kitchen gear** *(recommended)*
- C — `aud-budget.png` — **Students on a budget**
On tap: card highlights. B → green tick + "That's the call. They're already spending $150 a month on coffee, so $249 once is an easy story." A or C → amber note + "Close — but most coffee drinkers are happy with a $5 latte. A $249 machine needs people who already care about the shot. Marketers narrow, then widen." B is highlighted as the brief's audience either way. Button enables after any tap.
**Button:** Lock it in
**Event:** `q1_answered` (choice, correct)

### Screen 6 — How ads get attention (the lesson)
**Headline:** Before you write a word: how ads get attention.
**Body:** Nobody opens Instagram to see an ad. The only way in is to say something the customer already feels. Marketers pull one of three levers.
**Visual:** three cards revealed one at a time on each tap of the button (button reads **Next lever**, **Next lever**, then **Got it**). Each: lever name in the brand accent, one-line definition, and an example headline in quiet grey.
- **Pain** — *What's pushing them to change.* — "Stop renting your espresso from a café"
- **Desire** — *The outcome they already picture.* — "Barista-level espresso in your own kitchen"
- **Speed** — *The same result, faster.* — "From bed to a real espresso in under a minute"
After the third card, one closing line fades in: *Every headline you've ever stopped for pulled one of these.*
**Button:** Got it
**Event:** `lesson_viewed` (levers revealed)

### Screen 7 — Q2: Which lever do you pull?
**Headline:** Second call: which lever do you pull?
**Body:** Pick the reason your customer would click your ad. Which words will make them pay attention?
**Visual:** three cards, each with the lever tag in the brand accent and the actual headline:
- **PAIN** — *Stop renting your espresso from a café*
- **DESIRE** — *Barista-level espresso in your own kitchen*
- **SPEED** — *From bed to a real espresso in under a minute*
Tap → feedback that treats the choice as a deliberate marketer's read (never "correct", never "all three work"):
- Pain → "You're betting they feel the $150 a month more than they feel the craving. The ad will lead with the bill."
- Desire → "You're betting they've already pictured the kitchen and just need to see it. The ad will lead with the shot, not the price."
- Speed → "You're betting their mornings are the problem. The ad will lead with the clock."
**Button:** Lock it in
**Event:** `q2_answered` (lever)

### Screen 8 — Q3: How should it look?
**Headline:** Third call: how should it look?
**Body:** People decide whether to stop scrolling in about half a second, before they've read anything. The look does the first job.
**Visual:** three option cards, each a sample thumbnail:
- **Warm** — `vibe-warm.png` — "Morning light, steam, wood."
- **Bold** — `vibe-bold.png` — "Dark background, hard light, big type."
- **Minimal** — `vibe-minimal.png` — "The machine alone, lots of space."
**Button:** Lock it in
**Event:** `q3_answered` (choice)

### Screen 9 — Here's the brief you just wrote
**Headline:** You just wrote the brief, {firstname}.
**Body:** Every line below came from a decision you made. Copy it — you'll paste it into the software next.
**Visual:** the assembled brief as compact labelled blocks (Brand · Product · Price · Audience · Hook · Look · Goal · Deliverable), with Audience, Hook and Look highlighted in the brand accent and a small "you chose this" tag. Beneath: a large **Copy brief** button → "Copied ✓" → primary enables. Clipboard-failure fallback pre-fills Screen 11.
**Button:** Open the software →
**Event:** `brief_copied`

### Screen 10 — The bookmark moment
Full-screen pause. Nothing else on it.
**Headline:** You're about to open the actual software.
**Body:** Marketers use this on real brands. Bookmark it now so it's yours after today.
**Visual:** the app icon large in the centre, a URL pill beneath (`<domain>/studio`), then a platform-specific hint card: iOS → "Tap **Share** then **Add to Home Screen**"; Android → "Tap **⋮** then **Add to Home screen**"; desktop → "Press **⌘D** (Mac) or **Ctrl+D** (Windows)". Detect and show only the right one. No copy-link control — the previous screen already put the brief on the clipboard.
**Button:** Open the software
**Event:** `bookmark_moment_viewed`

### Screen 11 — The software
**Headline:** Paste your brief and press Generate.
**Body:** This is the same screen you'll come back to for real clients.
**Visual:** the studio input — a large textarea (pre-filled if the clipboard failed), a slim *AI Ad Studio* strip above it with a bookmark icon. Nothing else.
**Button:** Generate my ad
**Behaviour:** `audience`, `lever`, `vibe` are sent alongside the brief text so the model honours them: the chosen lever's headline IS the ad headline, and the image emphasis follows the lever (pain → the café receipt / empty takeaway cup in frame; desire → the glowing kitchen; speed → the shot pulling with a clock or a doorway). If `?e=` was in the entry link, the account is created silently here. Otherwise anonymous, rate-limited by device + IP (1 generation, 2 refinements).
**Event:** `generate_requested`

### Screen 12 — Generating (the teaching pause)
Full-screen, 15–30 seconds. Checklist ticks on real server events:
1. Reading your brief…
2. Building the headline from your lever → *"Working marketers call this the hook. It's the reason someone stops scrolling."*
3. Writing the copy → *"Headline, primary text, call to action."*
4. Designing the creative in your look → *"This is the part that used to take a designer a day."*
Below: "Usually about 20 seconds."
**Event:** `generation_started`, `generation_completed` (duration) or `generation_failed`

### Screen 13 — Your first ad
**Headline:** You just made your first ad, {firstname}.
**Body:** Your audience, your lever, your look — turned into a finished ad. That's the core loop of performance marketing, and you've done it once.
**Visual:** the generated creative full width; headline and primary text beneath; a row of three chips echoing their picks (e.g. *Café spenders · Pain · Warm*).
**Buttons:** primary **See it on Instagram**; secondary **Tweak it** (bottom sheet, one instruction box, refines in place) and **Save my ad**.
**Save my ad → light login.** Already identified: toast "Saved to your account ✓". Anonymous: bottom sheet "Where should we save it?" + email + **Save** → creates the account, attaches this ad, sends the magic link, shows "Saved ✓ — a link to your ads is in your inbox."
**Event:** `ad_viewed`, `refine_requested`, `save_requested`, `email_captured`

### Screen 14 — Live on Instagram
**Headline:** Here's how it looks in the feed.
**Body:** Same ad, real context. This is what a stranger scrolling at 9pm would see.
**Visual:** the Instagram post component (§6) — Alto avatar and handle, "Sponsored", the creative, the generated primary text as caption, "Shop now" CTA bar. Toggle Feed / Story.
**Button:** What could this ad do?
**Event:** `instagram_preview_viewed`

### Screen 15 — What it's worth
Three beats, revealed on successive taps.

**Beat A — results you can get.** Heading: *What you chose to target:* then three lines. The label is bold, then a short reason: **Café spenders** — they love coffee and spend a lot on it! (or **Anyone who drinks coffee** / **Students**, matching their pick). **Pain angle** — they're paying for the same thing day in, day out. (**Desire angle** — they've already pictured the kitchen, and the ad shows them the shot. **Speed angle** — their mornings are rushed, so the ad leads with how fast it is.) **Warm** — you like the look and feel of a warmer tone for the ads. (**Bold** — you want dark contrast and hard light, so the ad stops the scroll. **Minimal** — you want the machine on its own, with lots of space around it.) Then three big numbers — e.g. **1,200 people** a day, **1.5%** click-through, **18 clicks** — and: "Illustrative numbers based on typical benchmarks for this kind of product; real results depend on budget, audience and testing."
Button: **And if it made 5 sales?**

**Beat B — 5 sales.** **5 sales × $249 = $1,245** counts up. Line: "Alto needed about 200 machines a month. That's what ads like yours, running every day, are for."
Button: **What does the marketer get?**

**Beat C — the marketer's cut (interactive).** Headline: *The best performance marketers get paid a share of the sales they make.* Body: "A base, plus a percentage — a real income built on ads like the one you just made." The right-hand panel shows an interactive commission calculator instead of a fixed figure: a benchmark line ("A realistic winning ad drives anywhere from $20k–$100k a month in sales, depending on the size of the brand"), a slider for monthly sales ($20k–$100k), and the marketer's cut updating live beneath it (the same 10–20% share, e.g. $50k → **$5,000–$10,000 / month**) so the prospect future-paces their own income. Directly beneath, a "People who started where you are" card with three real examples (name · time in · base + share; e.g. *Nick · 18 months in · $10k/mo base + 20% of sales*) and the line "The best part is, these roles come with a base level of pay, so you're never worried about your next paycheck." Placed under the cut so it reads as the payoff's evidence.
**Phone only (Beat C).** Beats A and B already showed the story, so on a phone Beat C does not repeat that copy or the 10–20% of sales figure. It shows the same calculator as Screen 3 (*If the ad you generated makes:*), then the "People who started where you are" quotes in the space under the card, then the close buttons. Laptop Beat C is unchanged.

Then the close:
**Headline:** You've done the first rep. The program is where you do the next thousand.
**Buttons:** primary — `src=call` → **I'm ready for my call**; `src=webinar` → **Book my call**. Secondary: **Keep using the software** → `/studio` (anonymous → light-login sheet). Tertiary: **Download my ad**.
**Event:** `payoff_a`, `payoff_b`, `payoff_c`, `cta_clicked` (which)

Numbers come from the copy model's structured output, clamped server-side.

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

## 7. Layout and UX rules for Cursor (responsive)

**Breakpoints.** Phone `< 768px`; tablet `768–1023px`; laptop `≥ 1024px`.

**Phone (primary).** Single column, 390px design width, tested at 375 and 430. Frame line + progress dots at top. Primary button fixed to the bottom of the viewport with safe-area padding, full width, 56px. `100dvh`, not `100vh`.

**Laptop.** Use the screen. A two-column stage, max-width 1200px, centred, with 48px gutters:
- Left column (5/12): frame line, headline (up to 48px), body, and the primary button *inline* beneath the copy (not fixed), auto width, left-aligned. Vertically centred.
- Right column (7/12): the screen's visual (brief card, ad creative, Instagram frame, payoff numbers) on a soft surface panel with the site's card radius, vertically centred, max visual width 560px.
- Screens whose visual *is* the content (Screen 12 generating, Screen 10 bookmark moment, Screens 5–8 questions) use a single centred column max-width 640px instead.
- Progress dots move to the top-left above the frame line.

**Tablet.** Single column like phone but max-width 640px, button inline.

**Everything.**
- Fonts, colours, radii from `src/styles/tokens.css` (§3b). No serif anywhere.
- Transitions: Framer Motion `AnimatePresence mode="wait"`: exit fade 180ms, enter fade + 12px rise 320ms ease-out, children staggered 60ms. Back reverses. Respect `prefers-reduced-motion`.
- Back must always work: real state change to the previous step, and browser back/forward move between steps (history state per step).
- Tap targets ≥ 44px. Inputs ≥ 16px (prevents iOS zoom).
- Images via `next/image` with blurred placeholders; brief images from `/public/brief/`, generated creative from Supabase Storage.
- Copy-to-clipboard: `navigator.clipboard.writeText` with a `textarea.select()` fallback.
- No modals in the guided flow. Bottom sheets only (light login, Tweak it).
- Option cards (Screens 5–8): full-width on phone, 3-across on laptop; 44px+ tap targets; selected state uses the brand accent ring; keyboard-selectable.
- Persist flow position and captured data in `localStorage`.
- Every network action has an inline error state with a retry, worded plainly.

## 8. Analytics

Event per screen (names above) with properties `src`, `step`, `duration_ms`, `user_id`. Funnel view: Screen 1 → 11 drop-off. Alert if generation failure rate > 5% in an hour. PostHog (free tier is enough) or Vercel Analytics custom events.

## 9. Non-goals for v1

- No account passwords, profiles or teams.
- No video ads.
- No brand-asset upload (logo/product photo) — v2 candidate, and a strong one: `gpt-image-2.5` takes reference images, so "upload your product photo" becomes a natural studio upgrade.
- No ad publishing to Meta. The Instagram frame is a preview.
- No multi-language.

## 10. Open questions for Nick

- Booking link and pre-call video URL for Screen 9 CTAs.
- Brand name for the tool (working name: **AI Ad Studio**). It should feel like a product they'd want on their home screen.
- Do you want the sample brief to be a fictional brand (current: Alto, $249 espresso machine — safe, recommended) or a real partner brand from your internship network (more believable, needs permission)?
- Daily caps: 3 generations / 6 refinements to start?
