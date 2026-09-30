// AI-facing prompt constants — copied verbatim from spec/03-PROMPTS.md.
// The copy model (TEXT_MODEL) turns a brief into an AdConcept; the image model
// (IMAGE_MODEL) renders concept.imagePrompt. Never put keys here — server only.

/**
 * System prompt — brief → AdConcept (text model, JSON schema output).
 * Verbatim from spec/03-PROMPTS.md → "System prompt".
 */
export const SYSTEM_PROMPT = `You are a senior performance marketer at a US agency. You turn client briefs into a single, high-performing Instagram ad concept, and you brief the designer with a precise image prompt.

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
Do not invent conversion rates or ROAS. Keep every number conservative.`;

/**
 * Addendum appended to the system prompt when `choices` are present.
 * Verbatim from spec/03-PROMPTS.md → "Addendum appended to the system prompt".
 * The chosen lever's headline IS the ad headline.
 */
export function choicesAddendum(choices: {
  leverHeadline: string;
  leverBriefText: string;
  leverImageEmphasis: string;
  vibeImageStyle: string;
}): string {
  return `The marketer has already chosen the HOOK and the LOOK. The headline MUST be exactly: "${choices.leverHeadline}" (you may only trim it if it exceeds 40 characters, keeping its meaning). The hook and primaryText must follow the same lever: ${choices.leverBriefText}. The imagePrompt MUST include this emphasis: "${choices.leverImageEmphasis}" and follow this visual style: "${choices.vibeImageStyle}". Do not substitute a different hook, emphasis or style.`;
}

export type AdFormat = "feed" | "story" | "landscape";

/**
 * Image prompt template — what actually goes to the image model. Wraps the
 * model-written `concept.imagePrompt` with format guidance only.
 * Verbatim from spec/03-PROMPTS.md → "Image prompt template".
 */
export function wrapImagePrompt(imagePrompt: string, format: AdFormat = "feed"): string {
  const output =
    format === "story"
      ? "story (9:16 vertical)"
      : format === "landscape"
        ? "landscape (1.91:1)"
        : "feed post (1:1 square)";
  return `${imagePrompt}

Output: a finished Instagram ${output} advertisement. Clean, premium, commercial quality. Text must be spelled exactly as given and fully legible. No watermarks, no borders, no UI elements.`;
}

/**
 * Tone chip mapping (studio only) — appends one line to the image prompt.
 * Verbatim from spec/03-PROMPTS.md → "Tone chip mapping".
 */
export const TONE_MAP: Record<string, string> = {
  Bold: "high-contrast colours, punchy typography",
  Clean: "minimal, lots of negative space, soft neutrals",
  Playful: "bright palette, a touch of humour in the styling",
  Premium: "dark moody palette, editorial lighting, restrained type",
};

/**
 * Refine prompt (multi-turn) — the user's instruction goes to the same
 * Responses thread via `previous_response_id`, prefixed as below.
 * Verbatim from spec/03-PROMPTS.md → "Refine prompt".
 */
export function refinePrompt(instruction: string): string {
  return `Edit the previous image. Keep the composition, product, brand text and overall style unchanged except for this instruction: "${instruction}". Keep all text legible and spelled exactly as before unless the instruction changes the words.`;
}

/**
 * Refine guardrails — cap at 200 chars; reject "logo of", "celebrity", or a
 * URL. See spec/03-PROMPTS.md → "Guardrails".
 */
export const REFINE_MAX_CHARS = 200;
export const REFINE_BLOCKED_MESSAGE =
  "Try describing the change to the colours, layout, headline or setting";

/** Returns a rejection message if the instruction violates a guardrail, else null. */
export function checkRefineGuardrails(instruction: string): string | null {
  const trimmed = instruction.trim();
  if (trimmed.length === 0 || trimmed.length > REFINE_MAX_CHARS) {
    return REFINE_BLOCKED_MESSAGE;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes("logo of") || lower.includes("celebrity")) {
    return REFINE_BLOCKED_MESSAGE;
  }
  // Any URL.
  if (/https?:\/\/|www\.|\b[\w-]+\.(com|net|org|io|co|ai|app)\b/i.test(trimmed)) {
    return REFINE_BLOCKED_MESSAGE;
  }
  return null;
}
