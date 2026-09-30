"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import AdSpendCalculator from "../AdSpendCalculator";
import StarterQuotes from "../StarterQuotes";
import { BRAND } from "@/lib/brief";
import type { Payoff as PayoffNumbers } from "@/lib/payoff";
import CountUp from "../CountUp";
import { useFlow } from "../FlowShell";
import { PLACEHOLDER_AD } from "../placeholderAd";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 15 — What it's worth. See spec/01-PRD.md §4.

// Beat A — what they chose, with a one-line reason. The label is bold; the
// reason explains the call so the list isn't just three bare words.
type TargetLine = { label: string; reason: string };

const AUDIENCE_LINE: Record<string, TargetLine> = {
  cafe: {
    label: "Café spenders",
    reason: "they love coffee and spend a lot on it!",
  },
  everyone: {
    label: "Anyone who drinks coffee",
    reason: "coffee is already part of their day, so the ad starts from a habit.",
  },
  budget: {
    label: "Students",
    reason: "they're watching every dollar, so the ad has to earn the $249.",
  },
};

const LEVER_LINE: Record<string, TargetLine> = {
  pain: {
    label: "Pain angle",
    reason: "they're paying for the same thing day in, day out.",
  },
  desire: {
    label: "Desire angle",
    reason: "they've already pictured the kitchen, and the ad shows them the shot.",
  },
  speed: {
    label: "Speed angle",
    reason: "their mornings are rushed, so the ad leads with how fast it is.",
  },
};

const LOOK_LINE: Record<string, TargetLine> = {
  warm: {
    label: "Warm",
    reason: "you like the look and feel of a warmer tone for the ads.",
  },
  bold: {
    label: "Bold",
    reason: "you want dark contrast and hard light, so the ad stops the scroll.",
  },
  minimal: {
    label: "Minimal",
    reason: "you want the machine on its own, with lots of space around it.",
  },
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "$",
  CAD: "$",
};
function symbolFor(code: string): string {
  return CURRENCY_SYMBOL[code] ?? (code.length <= 1 ? code : `${code} `);
}

export default function Payoff() {
  const { data, config } = useFlow();
  // 0 = Beat A only, 1 = + Beat B, 2 = + Beat C (close).
  const [beat, setBeat] = useState(0);

  // Real payoff numbers when present; placeholder otherwise (dev / back-nav).
  const gen = data.generation;
  const payoff: PayoffNumbers = gen?.payoff ?? {
    reach: PLACEHOLDER_AD.payoff.reach,
    ctr: PLACEHOLDER_AD.payoff.ctrPct,
    clicks: PLACEHOLDER_AD.payoff.clicks,
    fiveSales: PLACEHOLDER_AD.payoff.fiveSales,
    cutLow: PLACEHOLDER_AD.payoff.cutLow,
    cutHigh: PLACEHOLDER_AD.payoff.cutHigh,
    currency: "USD",
    price: PLACEHOLDER_AD.payoff.price,
  };
  const cur = gen ? symbolFor(payoff.currency) : PLACEHOLDER_AD.payoff.currency;

  const targets = [
    AUDIENCE_LINE[data.audienceId ?? ""] ?? AUDIENCE_LINE.cafe,
    LEVER_LINE[data.leverId ?? ""] ?? LEVER_LINE.pain,
    LOOK_LINE[data.vibeId ?? ""] ?? LOOK_LINE.warm,
  ];

  const callCtaLabel =
    data.src === "call" ? "I'm ready for my call" : "Book my call";
  const callCtaHref =
    (data.src === "call"
      ? config.precallVideoUrl ?? config.bookingUrl
      : config.bookingUrl) ?? "#";

  const downloadHref = gen
    ? `/api/ads/${gen.adId}/download`
    : PLACEHOLDER_AD.imageSrc;

  return (
    <>
      <StageLayout
        headline={
          <LeftNarrative beat={beat} targets={targets} />
        }
        visual={<NumbersPanel beat={beat} payoff={payoff} cur={cur} />}
        primary={
          beat < 2 ? (
            <PrimaryButton onClick={() => setBeat((b) => b + 1)}>
              {beat === 0
                ? "And if it made 5 sales?"
                : "What does the marketer get?"}
            </PrimaryButton>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={callCtaHref}
                className="flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-cta transition-colors hover:bg-primary/80 lg:w-auto"
              >
                {callCtaLabel}
              </a>
              <a
                href={downloadHref}
                download
                className="flex h-10 w-full items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Download my ad
              </a>
            </div>
          )
        }
      />
    </>
  );
}

function LeftNarrative({
  beat,
  targets,
}: {
  beat: number;
  targets: TargetLine[];
}) {
  const reduce = useReducedMotion();
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: "easeOut" as const },
      };

  return (
    <div
      className={`flex flex-col gap-4${beat >= 2 ? " max-lg:hidden" : ""}`}
    >
      <div>
        <h1 className="text-xl font-semibold leading-snug tracking-tight lg:text-3xl">
          What you chose to target:
        </h1>
        <ul className="mt-3 flex flex-col gap-3">
          {targets.map((line) => (
            <li
              key={line.label}
              className="flex items-start gap-3 text-base leading-snug text-foreground lg:text-lg"
            >
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/35"
              />
              <span>
                <strong className="font-semibold">{line.label}</strong>
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {line.reason}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {beat >= 1 ? (
        <motion.p
          {...reveal}
          className="text-base leading-relaxed text-muted-foreground text-pretty"
        >
          {BRAND.name} needed about {BRAND.unitsNeeded} machines a month.
          That&apos;s what ads like yours, running every day, are for.
        </motion.p>
      ) : null}

      {beat >= 2 ? (
        <motion.div {...reveal} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-balance lg:text-2xl">
            The best performance marketers get paid a share of the sales they
            make.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            A base, plus a percentage — a real income built on ads like the one
            you just made.
          </p>
          <p className="text-lg font-semibold leading-snug tracking-tight text-balance lg:text-xl">
            You&apos;ve done the first rep. The program is where you do the next
            thousand.
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

function NumbersPanel({
  beat,
  payoff,
  cur,
}: {
  beat: number;
  payoff: PayoffNumbers;
  cur: string;
}) {
  const reduce = useReducedMotion();
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: "easeOut" as const },
      };

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Beat A — results you can get. On phone, beat C replaces this stack
          with the ad-spend calculator: beats A and B already told the story. */}
      <div className={beat >= 2 ? "max-lg:hidden" : undefined}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat
            value={<CountUp value={payoff.reach} />}
            label="people reached per day"
          />
          <Stat
            value={<CountUp value={payoff.ctr} decimals={1} suffix="%" />}
            label="click-through"
          />
          <Stat
            value={<CountUp value={payoff.clicks} />}
            label="clicks to the site"
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
          Illustrative numbers based on typical benchmarks for this kind of
          product; real results depend on budget, audience and testing.
        </p>
      </div>

      {/* Beat B — 5 sales. */}
      {beat >= 1 ? (
        <motion.div
          {...reveal}
          className={`rounded-[var(--radius-card)] border border-border bg-muted/60 p-5${beat >= 2 ? " max-lg:hidden" : ""}`}
        >
          <p className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            5 sales × {cur}
            {payoff.price} = {cur}
            <CountUp value={payoff.fiveSales} />
          </p>
        </motion.div>
      ) : null}

      {/* Beat C — interactive commission calculator. Desktop keeps the
          10–20% of sales slider. Phone uses 3% of ad spend so one ad reads
          as about $1–2k/month. */}
      {beat >= 2 ? (
        <motion.div {...reveal}>
          <div className="hidden lg:block">
            <CommissionCalculator payoff={payoff} cur={cur} />
          </div>
          <div className="flex flex-col gap-4 lg:hidden">
            <AdSpendCalculator currency={cur} />
            <StarterQuotes />
          </div>
        </motion.div>
      ) : null}

      {/* Beat C — proof: marketers who started where the prospect is. Sits
          directly under the cut so it reads as the payoff's evidence. */}
      {beat >= 2 ? (
        <motion.div
          {...reveal}
          className="hidden lg:block"
        >
          <StarterQuotes />
        </motion.div>
      ) : null}
    </div>
  );
}

/**
 * Interactive commission calculator. The prospect slides the monthly sales a
 * winning ad drives ($20k–$100k, the realistic benchmark) and sees their cut
 * update live, using the same 10–20% share behind Beat C's numbers.
 */
const REV_MIN = 20_000;
const REV_MAX = 100_000;
const REV_STEP = 5_000;

function CommissionCalculator({
  payoff,
  cur,
}: {
  payoff: PayoffNumbers;
  cur: string;
}) {
  const [revenue, setRevenue] = useState(50_000);

  // Recover the marketer's share from Beat C's clamped numbers (falls back to
  // the standard 10–20% arrangement if anything is missing).
  const pctLow = payoff.fiveSales > 0 ? payoff.cutLow / payoff.fiveSales : 0.1;
  const pctHigh = payoff.fiveSales > 0 ? payoff.cutHigh / payoff.fiveSales : 0.2;
  const roundTo = (n: number, to: number) => Math.round(n / to) * to;
  const cutLow = roundTo(revenue * pctLow, 100);
  const cutHigh = roundTo(revenue * pctHigh, 100);

  return (
    <div className="rounded-[var(--radius-card)] border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Your cut, at scale
      </p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground text-pretty">
        A realistic winning ad drives anywhere from {cur}20k–{cur}100k a month in
        sales, depending on the size of the brand. Slide it.
      </p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">
            Monthly sales this ad drives
          </span>
          <span className="text-sm font-semibold text-foreground">
            {cur}
            {revenue.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={REV_MIN}
          max={REV_MAX}
          step={REV_STEP}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          aria-label="Monthly sales this ad drives"
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-primary/20 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
          <span>{cur}20k</span>
          <span>{cur}100k</span>
        </div>
      </div>

      <div className="mt-4 border-t border-primary/20 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Your cut
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {cur}
          {cutLow.toLocaleString()}–{cur}
          {cutHigh.toLocaleString()}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            / month
          </span>
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
