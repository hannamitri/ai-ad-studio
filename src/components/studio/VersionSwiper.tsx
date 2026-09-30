"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { aspectClass, type AdVersion, type StudioFormat } from "./types";

// Swipe / arrow between the versions of the current ad (v1 original, v2+
// refinements). See spec/01-PRD.md §5. Touch-swipe on phones, arrow buttons on
// larger screens, dots as position indicator. Respects prefers-reduced-motion.
export default function VersionSwiper({
  versions,
  index,
  onIndexChange,
  format,
  alt,
}: {
  versions: AdVersion[];
  index: number;
  onIndexChange: (index: number) => void;
  format: StudioFormat;
  alt: string;
}) {
  const reduce = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  const clamped = Math.min(Math.max(index, 0), versions.length - 1);
  const current = versions[clamped];
  const canPrev = clamped > 0;
  const canNext = clamped < versions.length - 1;

  function go(delta: number) {
    const target = clamped + delta;
    if (target < 0 || target > versions.length - 1) return;
    onIndexChange(target);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted",
          aspectClass(format),
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current?.versionId ?? clamped}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {current?.imageUrl ? (
              <Image
                src={current.imageUrl}
                alt={alt}
                fill
                sizes="(max-width: 1023px) 100vw, 560px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Image unavailable
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {versions.length > 1 ? (
          <>
            <ArrowButton
              side="left"
              disabled={!canPrev}
              onClick={() => go(-1)}
            />
            <ArrowButton
              side="right"
              disabled={!canNext}
              onClick={() => go(1)}
            />
          </>
        ) : null}
      </div>

      {versions.length > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {versions.map((v, i) => (
              <button
                key={v.versionId}
                type="button"
                aria-label={`Version ${v.version}`}
                aria-current={i === clamped ? "true" : undefined}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === clamped ? "w-4 bg-primary" : "w-1.5 bg-foreground/20",
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {current?.version === 1
              ? "Original"
              : `Tweak ${(current?.version ?? 1) - 1}`}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous version" : "Next version"}
      className={cn(
        "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-card backdrop-blur transition-opacity hover:bg-background disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  );
}
