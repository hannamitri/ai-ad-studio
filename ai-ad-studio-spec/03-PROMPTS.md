# Prompts, sample brief and payoff logic

Copy these into `src/lib/prompts/*.ts` as constants. The sample brief is what Screens 2–3 show and what gets pasted on Screen 5.

---

## Sample brief (fictional brand, safe to use)

```
BRIEF — Meta ads for Kindred Coffee Co.

Who we are: Kindred is a small-batch coffee roaster based in Melbourne. We roast to order and ship Australia-wide within 48 hours.

What we're promoting: the Kindred Starter Box — three 250g bags (a light, a medium and a dark roast) plus a tasting card. Price: $89, free shipping.

Who we want to reach: people aged 25–40 in Australian capital cities who already buy specialty coffee or own a home espresso machine. They care about freshness and where their coffee comes from, and they're tired of supermarket beans going stale.

What makes us different: roasted the day you order, single-origin beans, and you can see the exact farm on every bag.

Goal: online sales of the Starter Box. Tone: warm, confident, a little bit playful. Avoid anything that looks like a stock photo.

Deliverable: one Instagram feed ad — image plus copy.
```

Why this brief works for the flow: a clear product, a clear price ($89 → 5 sales = $445), a consumer product everyone understands, and a visual that AI image models render well (coffee, packaging, warm light).

---

## System prompt — brief → AdConcept (text model, JSON schema output)

```
You are a senior performance marketer at an Australian agency. You turn client briefs into a single, high-performing Instagram ad concept, and you brief the designer with a precise image prompt.

You will receive a client brief. Return ONLY a JSON object matching the provided schema. Rules:

BRAND
- brand.name: the brand as written in the brief. brand.handle: a plausible lowercase Instagram handle with no spaces. brand.initials: 1–2 letters.
- product.name and product.price: pull directly from the brief. If no price is given, estimate a realistic one for that product category and country and note nothing else. Currency: infer from the brief (default AUD).

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

For the sample brief this produces something like: reach 1,200 · CTR 1.5% · 18 clicks · 5 × $89 = **$445** · marketer's cut **$45–$89**. Always show the "illustrative" line under Beat A.

---

## Loading-state copy (Screen 6) — final

1. Reading the brief…
2. Finding the angle — *Working marketers call this the hook. It's the reason someone stops scrolling.*
3. Writing the copy — *Headline, primary text, call to action.*
4. Designing the creative — *This is the part that used to take a designer a day.*

Footer: "Usually about 20 seconds."

## Error copy — final

- Generation failed: "That one didn't come out. It happens — tap to try again, it won't count against your free ads."
- Daily cap: "You've used today's free generations — they reset at midnight. Everything you've made is saved right here."
- Capacity switch off: "We're at capacity right now. Your seat is saved and the link in your inbox will get you straight back in."
- Clipboard blocked: "Your phone didn't let us copy that — no problem, we've filled it in for you on the next screen."
