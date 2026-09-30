// Payoff numbers for Screen 13 — clamp the model's figures and compute the
// arithmetic in code (never trust the model for maths).
// Copied verbatim from spec/03-PROMPTS.md → "Payoff numbers".
import type { AdConcept } from "@/types/ad";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type Payoff = {
  reach: number;
  ctr: number;
  clicks: number;
  fiveSales: number;
  cutLow: number;
  cutHigh: number;
  currency: string;
  /** The product price — used by Screen 13 ("5 sales × $price"). */
  price: number;
};

export function buildPayoff(c: AdConcept): Payoff {
  const reach = clamp(c.payoff.dailyReach, 500, 5000);
  const ctr = clamp(c.payoff.ctrPct, 0.8, 2.5);
  const clicks = Math.round((reach * ctr) / 100);
  const price = c.product.price;
  const fiveSales = price * 5;
  const lo = clamp(c.payoff.commissionPctLow, 10, 20);
  const hi = clamp(c.payoff.commissionPctHigh, lo, 20);
  return {
    reach,
    ctr,
    clicks,
    fiveSales,
    cutLow: Math.round((fiveSales * lo) / 100),
    cutHigh: Math.round((fiveSales * hi) / 100),
    currency: c.product.currency,
    price,
  };
}
