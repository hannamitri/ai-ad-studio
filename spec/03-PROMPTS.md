# Prompts, sample brief and payoff logic

Copy these into `src/lib/prompts/*.ts` as constants. The brief is assembled from the prospect's choices on Screens 4, 6 and 7, shown on Screen 8 and pasted on Screen 10.

---

## The brief — assembled from the prospect's three choices

Screens 4, 6 and 7 capture `audience`, `lever`, `vibe`; Screen 8 assembles them into the brief; Screen 10 sends the text plus the structured choices to `/api/generate`.

```ts
export const BRAND = {
  name: "Alto", handle: "alto.coffee", initials: "AL",
  founder: "Marcus",
  city: "Portland, Oregon",
  product: "The Alto espresso machine", price: 249, currency: "USD",
  productLine: "a compact home espresso machine that pulls café-quality shots in under 30 seconds",
  goalMonthly: 50000, unitsNeeded: 200,
};

export const AUDIENCE_OPTIONS = [
  { id: "everyone", label: "Anyone who drinks coffee", img: "/brief/aud-everyone.png", recommended: false,
    feedback: "Close — but most coffee drinkers are happy with a $5 latte. A $249 machine needs people who already care about the shot. Marketers narrow, then widen." },
  { id: "cafe", label: "People spending $5+ a day at cafés who own good kitchen gear", img: "/brief/aud-cafe.png", recommended: true,
    feedback: "That's the call. They're already spending $150 a month on coffee, so $249 once is an easy story.",
    briefText: "People in US cities spending $5+ a day at cafés, who already own good kitchen gear and care about the quality of the shot." },
  { id: "budget", label: "Students on a budget", img: "/brief/aud-budget.png", recommended: false,
    feedback: "Close — but most coffee drinkers are happy with a $5 latte. A $249 machine needs people who already care about the shot. Marketers narrow, then widen." },
];

export const LEVERS = [
  { id: "pain",   name: "Pain",   definition: "What's pushing them to change.",       example: "Stop renting your espresso from a café" },
  { id: "desire", name: "Desire", definition: "The outcome they already picture.",     example: "Barista-level espresso in your own kitchen" },
  { id: "speed",  name: "Speed",  definition: "The same result, faster.",              example: "From bed to a real espresso in under a minute" },
];

export const LEVER_OPTIONS = [
  { id: "pain",   tag: "PAIN",   headline: "Stop renting your espresso from a café",
    feedback: "You're betting they feel the $150 a month more than they feel the craving. The ad will lead with the bill.",
    briefText: "Lead with the pain: they're paying $5 a day for espresso they could make at home.",
    imageEmphasis: "a crumpled café receipt or an empty takeaway cup visible in frame, the machine as the answer" },
  { id: "desire", tag: "DESIRE", headline: "Barista-level espresso in your own kitchen",
    feedback: "You're betting they've already pictured the kitchen and just need to see it. The ad will lead with the shot, not the price.",
    briefText: "Lead with the desire: a barista-quality shot pulled in their own beautiful kitchen.",
    imageEmphasis: "a rich espresso shot mid-pour in a glowing, well-kept kitchen, aspirational" },
  { id: "speed",  tag: "SPEED",  headline: "From bed to a real espresso in under a minute",
    feedback: "You're betting their mornings are the problem. The ad will lead with the clock.",
    briefText: "Lead with speed: a real espresso in under a minute on a rushed morning.",
    imageEmphasis: "morning light, a clock or watch or a doorway suggesting the rush, the shot already pulled" },
];

export const VIBE_OPTIONS = [
  { id: "warm",    label: "Warm",    sub: "Morning light, steam, wood.",           img: "/brief/vibe-warm.png",
    imageStyle: "warm morning kitchen light, wood and ceramic textures, gentle steam, soft shadows, inviting and domestic" },
  { id: "bold",    label: "Bold",    sub: "Dark background, hard light, big type.", img: "/brief/vibe-bold.png",
    imageStyle: "dark charcoal background, hard directional studio light, strong specular highlights on metal, large confident sans-serif headline, graphic composition" },
  { id: "minimal", label: "Minimal", sub: "The machine alone, lots of space.",     img: "/brief/vibe-minimal.png",
    imageStyle: "minimalist product photography on off-white, the machine alone, generous negative space, tiny shadow, small precise type" },
];

export function buildBrief(a: AudienceOption, l: LeverOption, v: VibeOption, firstName?: string) {
  const audience = AUDIENCE_OPTIONS.find(o => o.recommended)!; // the brief always uses the recommended audience
  return `BRIEF — Meta ads for ${BRAND.name}${firstName ? ` (prepared by ${firstName})` : ""}

Brand: ${BRAND.name}, a small espresso company from ${BRAND.city}. Online only.
Product: ${BRAND.product} — ${BRAND.productLine}.
Price: $${BRAND.price}, free shipping in the US.
Audience: ${audience.briefText}
Hook (${l.tag.toLowerCase()}): "${l.headline}" — ${l.briefText}
Look: ${v.label} — ${v.sub}
Goal: online sales of ${BRAND.product}. Target $${BRAND.goalMonthly.toLocaleString()}/month (≈${BRAND.unitsNeeded} machines).
Deliverable: one Instagram feed ad — image plus copy.`;
}
```

`/api/generate` body: `{ briefText, choices: { audience, lever, vibe }, format?, tone? }`. The server tells the copy model the chosen lever's headline IS the headline (see addendum), and appends `imageEmphasis` and `imageStyle` to the image prompt.

Why this brand: US, USD, gender-neutral, high-ticket ($249 → 5 sales = $1,245; cut $125–$249), a category everyone has an opinion about, a clean audience lesson (the $5-a-day buyer), and a product image models render beautifully.

---

## Brief images — one-off generation (`scripts/generate-brief-images.ts`)

Run once locally (`npm run brief-images`) with `OPENAI_API_KEY` and `IMAGE_MODEL` set. 1024×1024, quality medium, writes to `/public/brief/`. Skip files that already exist; delete the old Maison Vell set first. All: photorealistic, no people's faces, no text, no logos.

- `brand.png` — "A compact, beautifully designed home espresso machine in brushed steel and matte black on a light wooden kitchen bench, morning sunlight through a window, a fresh shot in a small ceramic cup beside it, soft steam."
- `product.png` — "Studio product photograph of a compact premium home espresso machine, brushed steel and matte black, three-quarter angle, on a neutral surface with soft light and a gentle reflection."
- `aud-everyone.png` — "A busy chain-café counter seen from the queue, many takeaway cups, bright flat lighting, generic and crowded."
- `aud-cafe.png` — "A well-kept modern kitchen counter with a burr coffee grinder, a pour-over set, a bag of specialty beans and a digital scale, warm daylight, considered and tidy."
- `aud-budget.png` — "A student dorm desk with a laptop, textbooks, a jar of instant coffee and a chipped mug, daylight, casual and cluttered."
- `vibe-warm.png` — "Espresso advertisement mock-up: espresso machine on a wooden bench in warm morning light, steam rising from a cup, soft shadows, space left for a headline."
- `vibe-bold.png` — "Espresso advertisement mock-up: espresso machine on a dark charcoal background with hard directional light and strong metallic highlights, graphic composition, space left for a large headline."
- `vibe-minimal.png` — "Espresso advertisement mock-up: espresso machine alone on an off-white background, tiny shadow, huge negative space."
- `icon.png` — "App icon: a rounded square in a warm orange, with a simple white abstract spark glyph in the centre, flat design, no text." (Screen 9)

---

## System prompt — brief → AdConcept (text model, JSON schema output)

```
You are a senior performance marketer at a US agency. You turn client briefs into a single, high-performing Instagram ad concept, and you brief the designer with a precise image prompt.

You will receive a client brief. Return ONLY a JSON object matching the provided schema. Rules:

BRAND
- brand.name: the brand as written in the brief. brand.handle: a plausible lowercase Instagram handle with no spaces. brand.initials: 1–2 letters.
- product.name and product.price: pull directly from the brief. If no price is given, estimate a realistic one for that product category and country and note nothing else. Currency: infer from the brief (default USD).

COPY
- hook: one line, under 90 characters, the reason a stranger stops scrolling. Plain language. Lead with the customer's situation or desire, not the brand.
- headline: under 40 characters, benefit-led, rendered on the image.
- primaryText: 1–3 short sentences, under 280 characters, conversational, cause-and-effect ("roasted the day you order, so it lands fresh"). No emoji spam (max 1). No hashtags. No ALL CAPS. No fear framing. No rhetorical fragments like "This isn't X. It's Y."
- cta: choose the one that matches the goal in the brief.

IMAGE PROMPT (imagePrompt, under 900 characters) — write it for an image generation model:
- Describe a single, uncluttered scene that shows the product as the hero, in the tone the brief asks for. Specify lighting, setting, camera angle and colour palette.
- Include the headline as legible text ON the image: quote it exactly and say where it sits (e.g. "bold sans-serif headline '…' in the top third, high contrast against the background"). Include the brand name as small text once. No other text.
- Say "photorealistic advertising photograph" unless the brief asks for illustration.
- Composition must work as a 1:1 square with safe margins for text.
- Never include real people's faces from the brief, real logos of other companies, or trademarks.

SOCIAL PROOF
- socialProof.likes: a plausible like count for a small-to-mid brand's ad (200–5000).

PAYOFF (illustrative benchmark figures for a modest daily budget of around $50):
- payoff.dailyReach: people reached per day (500–5000, depends on category and price).
- payoff.ctrPct: link click-through rate as a percentage (0.8–2.5).
- payoff.clicks: dailyReach × ctrPct / 100, rounded.
- payoff.commissionPctLow / High: typical performance-marketer revenue share range (10–20).
Do not invent conversion rates or ROAS. Keep every number conservative.
```

Addendum appended to the system prompt when `choices` are present:
```
The marketer has already chosen the HOOK and the LOOK. The headline MUST be exactly: "{lever.headline}" (you may only trim it if it exceeds 40 characters, keeping its meaning). The hook and primaryText must follow the same lever: {lever.briefText}. The imagePrompt MUST include this emphasis: "{lever.imageEmphasis}" and follow this visual style: "{vibe.imageStyle}". Do not substitute a different hook, emphasis or style.
```

User message: the raw brief text. Use `response_format: { type: "json_schema", json_schema: AdConcept }` (or the Responses API `text.format` equivalent) so the output is always parseable. Validate with zod; on failure retry once with the error appended.

---

## Image prompt template (what actually goes to the image model)

`concept.imagePrompt` is already written for the image model. Wrap it with format guidance only:

```
{concept.imagePrompt}

Output: a finished Instagram {format === 'story' ? 'story (9:16 vertical)' : format === 'landscape' ? 'landscape (1.91:1)' : 'feed post (1:1 square)'} advertisement. Clean, premium, commercial quality. Text must be spelled exactly as given and fully legible. No watermarks, no borders, no UI elements.
```

Tone chip mapping (studio only) appends one line: Bold → "high-contrast colours, punchy typography"; Clean → "minimal, lots of negative space, soft neutrals"; Playful → "bright palette, a touch of humour in the styling"; Premium → "dark moody palette, editorial lighting, restrained type".

---

## Refine prompt (multi-turn)

The user's instruction goes to the same Responses thread via `previous_response_id`. Prefix it:

```
Edit the previous image. Keep the composition, product, brand text and overall style unchanged except for this instruction: "{instruction}". Keep all text legible and spelled exactly as before unless the instruction changes the words.
```

Guardrails: cap instructions at 200 chars; reject instructions containing "logo of", "celebrity", or a URL with a friendly message ("Try describing the change to the colours, layout, headline or setting").

Suggestion chips (studio): *Brighter* → "Make the lighting brighter and warmer." · *Different headline* → opens an inline text field and sends "Change the headline text to: '{new}'." · *Show the product bigger* → "Make the product larger and more central." · *More premium* → "Make it feel more premium: darker, moodier lighting and more restrained typography."

---

## Payoff numbers — how Screen 9 is computed (server-side, `lib/payoff.ts`)

```ts
const clamp = (n:number, lo:number, hi:number) => Math.min(hi, Math.max(lo, n));
export function buildPayoff(c: AdConcept) {
  const reach = clamp(c.payoff.dailyReach, 500, 5000);
  const ctr = clamp(c.payoff.ctrPct, 0.8, 2.5);
  const clicks = Math.round(reach * ctr / 100);
  const price = c.product.price;
  const fiveSales = price * 5;
  const lo = clamp(c.payoff.commissionPctLow, 10, 20);
  const hi = clamp(c.payoff.commissionPctHigh, lo, 20);
  return {
    reach, ctr, clicks,
    fiveSales,
    cutLow: Math.round(fiveSales * lo / 100),
    cutHigh: Math.round(fiveSales * hi / 100),
    currency: c.product.currency,
  };
}
```

For the sample brief this produces something like: reach 1,200 · CTR 1.5% · 18 clicks · 5 × $198 = **$990** · marketer's cut **$99–$198**. Always show the "illustrative" line under Beat A.

---

## Loading-state copy (Screen 11) — final

1. Reading your brief…
2. Building the headline from your lever — *Working marketers call this the hook. It's the reason someone stops scrolling.*
3. Writing the copy — *Headline, primary text, call to action.*
4. Designing the creative in your look — *This is the part that used to take a designer a day.*

Footer: "Usually about 20 seconds."

## Error copy — final

- Generation failed: "That one didn't come out. It happens — tap to try again, it won't count against your free ads."
- Daily cap: "You've used today's free generations — they reset at midnight. Everything you've made is saved right here."
- Capacity switch off: "We're at capacity right now. Your seat is saved and the link in your inbox will get you straight back in."
- Clipboard blocked: "Your phone didn't let us copy that — no problem, we've filled it in for you on the next screen."
