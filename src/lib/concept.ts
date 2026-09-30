// brief -> AdConcept (zod-validated JSON). Calls TEXT_MODEL via the OpenAI
// Responses API with a strict json_schema output, validates with zod, and
// retries once on failure with the validation error appended.
// See spec/02-ARCHITECTURE.md → API routes and spec/03-PROMPTS.md.
// SERVER ONLY — reads OPENAI_API_KEY via getOpenAI(); never import client-side.
import { getOpenAI } from "@/lib/openai";
import { SYSTEM_PROMPT, choicesAddendum } from "@/lib/prompts";
import { AdConcept } from "@/types/ad";

// Hand-authored JSON schema mirroring AdConcept (src/types/ad.ts). Strict mode
// requires every property listed in `required` and additionalProperties:false.
// Length/range limits are enforced afterwards by the zod schema.
const AD_CONCEPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        handle: { type: "string" },
        initials: { type: "string" },
      },
      required: ["name", "handle", "initials"],
    },
    product: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        price: { type: "number" },
        currency: { type: "string" },
      },
      required: ["name", "price", "currency"],
    },
    hook: { type: "string" },
    headline: { type: "string" },
    primaryText: { type: "string" },
    cta: {
      type: "string",
      enum: ["Shop now", "Learn more", "Sign up", "Get offer", "Book now"],
    },
    imagePrompt: { type: "string" },
    socialProof: {
      type: "object",
      additionalProperties: false,
      properties: { likes: { type: "integer" } },
      required: ["likes"],
    },
    payoff: {
      type: "object",
      additionalProperties: false,
      properties: {
        dailyReach: { type: "integer" },
        ctrPct: { type: "number" },
        clicks: { type: "integer" },
        commissionPctLow: { type: "number" },
        commissionPctHigh: { type: "number" },
      },
      required: [
        "dailyReach",
        "ctrPct",
        "clicks",
        "commissionPctLow",
        "commissionPctHigh",
      ],
    },
  },
  required: [
    "brand",
    "product",
    "hook",
    "headline",
    "primaryText",
    "cta",
    "imagePrompt",
    "socialProof",
    "payoff",
  ],
} as const;

export type GenerateConceptArgs = {
  briefText: string;
  /** When present, appends the choices addendum to the system prompt. */
  choices?: {
    leverHeadline: string;
    leverBriefText: string;
    leverImageEmphasis: string;
    vibeImageStyle: string;
  };
};

export type ConceptResult = {
  concept: AdConcept;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
};

function buildSystemPrompt(choices?: GenerateConceptArgs["choices"]): string {
  if (!choices) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n${choicesAddendum(choices)}`;
}

/**
 * Generate and validate an AdConcept for a brief. Retries once, appending the
 * zod validation error so the model can self-correct.
 */
export async function generateConcept({
  briefText,
  choices,
}: GenerateConceptArgs): Promise<ConceptResult> {
  const openai = getOpenAI();
  const model = process.env.TEXT_MODEL;
  if (!model) throw new Error("TEXT_MODEL is not set");

  const system = buildSystemPrompt(choices);

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const input = lastError
      ? `${briefText}\n\nThe previous response failed validation with this error, fix it and return valid JSON:\n${lastError}`
      : briefText;

    const response = await openai.responses.create({
      model,
      instructions: system,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "AdConcept",
          schema: AD_CONCEPT_JSON_SCHEMA as Record<string, unknown>,
          strict: true,
        },
      },
    });

    const raw = response.output_text;
    const usage = {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      lastError = "Response was not valid JSON.";
      continue;
    }

    const parsed = AdConcept.safeParse(json);
    if (parsed.success) {
      return { concept: parsed.data, usage };
    }
    lastError = JSON.stringify(parsed.error.issues);
  }

  throw new Error(`Concept validation failed: ${lastError ?? "unknown error"}`);
}
