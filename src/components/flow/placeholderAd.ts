import { BRAND } from "@/lib/brief";

// Hardcoded ad concept used across Screens 12–14 as a fallback when there's no
// live generation (dev / back-nav). Numbers match the Alto brief ($249 → 5
// sales = $1,245, marketer's cut $125–$249) from src/lib/brief.ts.
export const PLACEHOLDER_AD = {
  imageSrc: "/brief/vibe-warm.png",
  brand: {
    name: BRAND.name,
    handle: BRAND.handle,
    initials: BRAND.initials,
  },
  headline: "Café-quality espresso at home",
  primaryText:
    "The Alto machine pulls café-quality espresso in under 30 seconds, right on your kitchen bench — no queue, no $5 a day. Just a real shot whenever you want one. $249, free US shipping.",
  cta: "Shop now",
  likes: 1284,
  payoff: {
    reach: 1200,
    ctrPct: 1.5,
    clicks: 18,
    price: BRAND.price,
    fiveSales: BRAND.price * 5,
    cutLow: 125,
    cutHigh: 249,
    currency: "$",
  },
} as const;
