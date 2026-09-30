"use client";

import { Target } from "lucide-react";
import { BRAND } from "@/lib/brief";
import AdSpendCalculator from "../AdSpendCalculator";
import StarterQuotes from "../StarterQuotes";
import CountUp from "../CountUp";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 3 — The goal. One idea per screen (PRD §3 point 1): this frame does
// nothing but state, plainly, the number the brand is chasing. Split out from
// "Meet the client" so the brand and the goal each get their own frame.
export default function ClientGoal() {
  const { next } = useFlow();

  return (
    <StageLayout
      headline={
        <>
          <h1 className="hidden text-2xl font-semibold leading-tight tracking-tight text-balance lg:block lg:text-4xl xl:text-[2.75rem]">
            Here&apos;s the goal.
          </h1>
          {/* Phone: screens 1–2 already set the scene. Lead with the money. */}
          <div className="flex flex-col gap-4 lg:hidden">
            <AdSpendCalculator />
            <StarterQuotes />
          </div>
        </>
      }
      body={
        <p className="desktop-only hidden text-base leading-relaxed text-muted-foreground text-pretty lg:block lg:text-lg">
          {BRAND.name} wants ${BRAND.goalMonthly.toLocaleString()} in online
          sales every month. That&apos;s where you come in.
        </p>
      }
      visual={
        <div className="desktop-only">
          <GoalCard />
        </div>
      }
      primary={<PrimaryButton onClick={next}>So where do I come in?</PrimaryButton>}
    />
  );
}

function GoalCard() {
  return (
    <div className="w-full rounded-[var(--radius-card)] border border-border bg-card p-6 lg:p-8">
      <div className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <Target className="size-3.5" strokeWidth={2} />
        Their goal
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            <CountUp value={BRAND.goalMonthly} prefix="$" />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            online sales a month they want to hit
          </p>
        </div>
        <span className="text-xl text-muted-foreground" aria-hidden>
          →
        </span>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            ≈ <CountUp value={BRAND.unitsNeeded} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">machines a month</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-snug text-muted-foreground">
        They can&apos;t get there without ads that convert.
      </p>
    </div>
  );
}
