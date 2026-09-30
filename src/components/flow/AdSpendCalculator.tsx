"use client";

import { useState } from "react";

// Phone-only commission calculator. A flat 3% of the ad spend one ad manages,
// so the number lands around $1–2k/month instead of a 10–20% cut of sales.
// Desktop keeps the sales-share calculator. See PRD §4 Screen 3 (phone) and
// Screen 15 Beat C (phone).

const SPEND_MIN = 30_000;
const SPEND_MAX = 70_000;
const SPEND_STEP = 5_000;
const SPEND_DEFAULT = 50_000;
const COMMISSION = 0.03;

export default function AdSpendCalculator({
  currency = "$",
}: {
  currency?: string;
}) {
  const [spend, setSpend] = useState(SPEND_DEFAULT);
  const cut = Math.round(spend * COMMISSION);

  return (
    <div className="w-full rounded-[var(--radius-card)] border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-sm font-medium leading-snug text-foreground text-pretty">
        If the ad you generated makes:
      </p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
        {currency}
        {cut.toLocaleString()}
        <span className="ml-1.5 text-base font-medium text-muted-foreground">
          / month
        </span>
      </p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Monthly ad spend
          </span>
          <span className="text-sm font-semibold text-foreground">
            {currency}
            {spend.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={SPEND_MIN}
          max={SPEND_MAX}
          step={SPEND_STEP}
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          aria-label="Monthly ad spend this ad manages"
          className="mt-1 h-11 w-full cursor-pointer accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
          <span>
            {currency}
            {SPEND_MIN / 1000}k
          </span>
          <span>
            {currency}
            {SPEND_MAX / 1000}k
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
        About 3% of the ad spend you manage. One decent ad is usually {currency}1–2k a month.
      </p>
    </div>
  );
}
