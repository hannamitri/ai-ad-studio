// AdConcept — the structured output the copy model returns for a brief.
// Schema copied verbatim from spec/02-ARCHITECTURE.md → "The AdConcept type".
import { z } from "zod";

export const AdConcept = z.object({
  brand: z.object({ name: z.string(), handle: z.string(), initials: z.string() }),
  product: z.object({
    name: z.string(),
    price: z.number(),
    currency: z.string().default("USD"),
  }),
  hook: z.string().max(90),
  headline: z.string().max(40),
  primaryText: z.string().max(280),
  cta: z.enum(["Shop now", "Learn more", "Sign up", "Get offer", "Book now"]),
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

export type AdConcept = z.infer<typeof AdConcept>;
