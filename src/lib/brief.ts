// The sample brief data — the prospect's three choices (Screens 4, 6, 7)
// assemble into the brief shown on Screen 8 and pasted on Screen 10.
// Copied verbatim from spec/03-PROMPTS.md → "The brief".

export type AudienceOption = {
  id: string;
  label: string;
  img: string;
  recommended: boolean;
  feedback: string;
  /** Only the recommended audience carries brief copy — it's what the brief uses. */
  briefText?: string;
};

/** A lever, as taught on Screen 5 (the attention lesson). */
export type Lever = {
  id: string;
  name: string;
  definition: string;
  example: string;
};

/** A lever as a Screen 6 choice — the chosen headline IS the ad headline. */
export type LeverOption = {
  id: string;
  tag: string;
  headline: string;
  feedback: string;
  briefText: string;
  imageEmphasis: string;
};

export type VibeOption = {
  id: string;
  label: string;
  sub: string;
  img: string;
  imageStyle: string;
};

export const BRAND = {
  name: "Alto",
  handle: "alto.coffee",
  initials: "AL",
  founder: "Marcus",
  city: "Portland, Oregon",
  product: "The Alto espresso machine",
  price: 249,
  currency: "USD",
  productLine:
    "a compact home espresso machine that pulls café-quality shots in under 30 seconds",
  goalMonthly: 50000,
  unitsNeeded: 200,
};

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: "everyone",
    label: "Anyone who drinks coffee",
    img: "/brief/aud-everyone.png",
    recommended: false,
    feedback:
      "Close — but most coffee drinkers are happy with a $5 latte. A $249 machine needs people who already care about the shot. Marketers narrow, then widen.",
  },
  {
    id: "cafe",
    label: "People spending $5+ a day at cafés who own good kitchen gear",
    img: "/brief/aud-cafe.png",
    recommended: true,
    feedback:
      "That's the call. They're already spending $150 a month on coffee, so $249 once is an easy story.",
    briefText:
      "People in US cities spending $5+ a day at cafés, who already own good kitchen gear and care about the quality of the shot.",
  },
  {
    id: "budget",
    label: "Students on a budget",
    img: "/brief/aud-budget.png",
    recommended: false,
    feedback:
      "Close — but most coffee drinkers are happy with a $5 latte. A $249 machine needs people who already care about the shot. Marketers narrow, then widen.",
  },
];

export const LEVERS: Lever[] = [
  {
    id: "pain",
    name: "Pain",
    definition: "What's pushing them to change.",
    example: "Stop renting your espresso from a café",
  },
  {
    id: "desire",
    name: "Desire",
    definition: "The outcome they already picture.",
    example: "Barista-level espresso in your own kitchen",
  },
  {
    id: "speed",
    name: "Speed",
    definition: "The same result, faster.",
    example: "From bed to a real espresso in under a minute",
  },
];

export const LEVER_OPTIONS: LeverOption[] = [
  {
    id: "pain",
    tag: "PAIN",
    headline: "Stop renting your espresso from a café",
    feedback:
      "You're betting they feel the $150 a month more than they feel the craving. The ad will lead with the bill.",
    briefText:
      "Lead with the pain: they're paying $5 a day for espresso they could make at home.",
    imageEmphasis:
      "a crumpled café receipt or an empty takeaway cup visible in frame, the machine as the answer",
  },
  {
    id: "desire",
    tag: "DESIRE",
    headline: "Barista-level espresso in your own kitchen",
    feedback:
      "You're betting they've already pictured the kitchen and just need to see it. The ad will lead with the shot, not the price.",
    briefText:
      "Lead with the desire: a barista-quality shot pulled in their own beautiful kitchen.",
    imageEmphasis:
      "a rich espresso shot mid-pour in a glowing, well-kept kitchen, aspirational",
  },
  {
    id: "speed",
    tag: "SPEED",
    headline: "From bed to a real espresso in under a minute",
    feedback:
      "You're betting their mornings are the problem. The ad will lead with the clock.",
    briefText:
      "Lead with speed: a real espresso in under a minute on a rushed morning.",
    imageEmphasis:
      "morning light, a clock or watch or a doorway suggesting the rush, the shot already pulled",
  },
];

export const VIBE_OPTIONS: VibeOption[] = [
  {
    id: "warm",
    label: "Warm",
    sub: "Morning light, steam, wood.",
    img: "/brief/vibe-warm.png",
    imageStyle:
      "warm morning kitchen light, wood and ceramic textures, gentle steam, soft shadows, inviting and domestic",
  },
  {
    id: "bold",
    label: "Bold",
    sub: "Dark background, hard light, big type.",
    img: "/brief/vibe-bold.png",
    imageStyle:
      "dark charcoal background, hard directional studio light, strong specular highlights on metal, large confident sans-serif headline, graphic composition",
  },
  {
    id: "minimal",
    label: "Minimal",
    sub: "The machine alone, lots of space.",
    img: "/brief/vibe-minimal.png",
    imageStyle:
      "minimalist product photography on off-white, the machine alone, generous negative space, tiny shadow, small precise type",
  },
];

export function buildBrief(
  a: AudienceOption,
  l: LeverOption,
  v: VibeOption,
  firstName?: string,
) {
  const audience = AUDIENCE_OPTIONS.find((o) => o.recommended)!; // the brief always uses the recommended audience
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
