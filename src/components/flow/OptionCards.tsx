"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardOption = {
  id: string;
  label: string;
  sub?: string;
  /** Thumbnail image (Screens 4 + 7). */
  img?: string;
  /** Icon alternative. */
  icon?: LucideIcon;
  /** Small brand-accent chip shown above the label (Screen 6 lever tag). */
  tag?: string;
  recommended?: boolean;
};

export type OptionFeedback = { tone: "good" | "warn"; text: string };

/**
 * The tappable option cards used on Screens 4–6. Full-width rows on phone,
 * 3-across on laptop. Selected state uses the brand accent ring, tap targets
 * are ≥44px, and the whole card is a keyboard-selectable button. A feedback
 * line fades in beneath the grid after a choice is made. See PRD §4 / §7.
 */
export default function OptionCards({
  options,
  selectedId,
  onSelect,
  feedback,
  "aria-label": ariaLabel,
}: {
  options: CardOption[];
  selectedId?: string;
  onSelect: (option: CardOption) => void;
  feedback?: OptionFeedback | null;
  "aria-label"?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-4"
      >
        {options.map((option) => {
          const selected = option.id === selectedId;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option)}
              className={cn(
                "group flex items-center gap-3 rounded-[var(--radius-card)] border bg-card p-3 text-left transition-all outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "lg:flex-col lg:items-stretch lg:p-4",
                selected
                  ? "border-primary ring-2 ring-primary"
                  : "border-border hover:border-foreground/25",
              )}
            >
              {option.img ? (
                <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted lg:h-32 lg:w-full">
                  <Image
                    src={option.img}
                    alt=""
                    fill
                    sizes="(max-width: 1023px) 64px, 240px"
                    className="object-cover"
                  />
                </span>
              ) : Icon ? (
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-lg transition-colors lg:size-14",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5 lg:size-6" strokeWidth={1.5} />
                </span>
              ) : null}

              <span className="min-w-0 flex-1 lg:mt-3">
                {option.tag ? (
                  <span className="mb-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {option.tag}
                  </span>
                ) : null}
                <span className="block text-[15px] font-semibold leading-snug text-foreground">
                  {option.label}
                </span>
                {option.recommended ? (
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Recommended
                  </span>
                ) : null}
                {option.sub ? (
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                    {option.sub}
                  </span>
                ) : null}
              </span>

              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors lg:hidden",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent",
                )}
              >
                <CheckIcon />
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.p
            key={feedback.text}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            className={cn(
              "mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm leading-snug",
              feedback.tone === "good"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            <span className="mt-0.5 shrink-0" aria-hidden>
              {feedback.tone === "good" ? "✓" : "!"}
            </span>
            <span>{feedback.text}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon(): ReactNode {
  return (
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
  );
}
