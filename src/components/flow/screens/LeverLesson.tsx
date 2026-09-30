"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LEVERS } from "@/lib/brief";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 5 — How ads get attention (the lesson). The three levers are revealed
// one at a time as the prospect taps the button ("Next lever" ×2, then "Got
// it"); a closing line fades in after the third. See spec/01-PRD.md §4.
export default function LeverLesson() {
  const { next } = useFlow();
  const reduce = useReducedMotion();
  // How many lever cards are visible (starts with the first already shown).
  const [revealed, setRevealed] = useState(1);
  const allRevealed = revealed >= LEVERS.length;

  function handleClick() {
    if (allRevealed) next();
    else setRevealed((n) => n + 1);
  }

  return (
    <StageLayout
      layout="centered"
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-3xl">
          Before you write a word: how ads get attention.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          Nobody opens Instagram to see an ad. The only way in is to say
          something the customer already feels. Marketers pull one of three
          levers.
        </p>
      }
      primary={
        <PrimaryButton onClick={handleClick}>
          {allRevealed ? "Got it" : "Next lever"}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3">
        {LEVERS.slice(0, revealed).map((lever) => (
          <motion.div
            key={lever.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: "easeOut" }}
            className="rounded-[var(--radius-card)] border border-border bg-card p-4"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {lever.name}
            </p>
            <p className="mt-1 text-base leading-snug text-foreground">
              {lever.definition}
            </p>
            <p className="mt-2 text-sm italic leading-snug text-muted-foreground">
              “{lever.example}”
            </p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {allRevealed ? (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: "easeOut" }}
            className="mt-5 text-center text-base font-medium leading-snug text-foreground text-pretty"
          >
            Every headline you&apos;ve ever stopped for pulled one of these.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </StageLayout>
  );
}
