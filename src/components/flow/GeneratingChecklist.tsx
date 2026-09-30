"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GENERATING_STEPS } from "@/lib/prompts";
import { cn } from "@/lib/utils";

// Screen 10 — the teaching pause. See spec/01-PRD.md §4 and spec/03-PROMPTS.md.
// Controlled by the real server SSE events (no fake timer): `active` is the
// count of steps that are active-or-done, so `active - 1` is the current index.
export default function GeneratingChecklist({ active }: { active: number }) {
  const steps = GENERATING_STEPS;
  const reduceMotion = useReducedMotion();

  return (
    <ul className="flex flex-col gap-5">
      {steps.map((step, i) => {
        const state =
          i < active - 1 ? "done" : i === active - 1 ? "active" : "pending";
        // Before the first tick, treat step 0 as active so it never looks stuck.
        const effective = active === 0 && i === 0 ? "active" : state;
        return (
          <li key={i} className="flex items-start gap-3">
            <StatusDot state={effective} reduceMotion={!!reduceMotion} />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-base font-medium transition-colors",
                  effective === "pending"
                    ? "text-muted-foreground/50"
                    : "text-foreground",
                )}
              >
                {step.label}
              </p>
              {step.explainer && effective !== "pending" ? (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22 }}
                  className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty"
                >
                  {step.explainer}
                </motion.p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusDot({
  state,
  reduceMotion,
}: {
  state: "done" | "active" | "pending";
  reduceMotion: boolean;
}) {
  if (state === "done") {
    return (
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
        <span
          className="size-3 rounded-full bg-foreground"
          style={{
            animation: reduceMotion
              ? undefined
              : "flow-pulse 1.1s ease-in-out infinite",
          }}
        />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
      <span className="size-3 rounded-full border-2 border-muted-foreground/30" />
    </span>
  );
}
