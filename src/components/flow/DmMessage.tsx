"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brief";

/**
 * Screen 3 — the "first message from a client" DM card. The message body types
 * itself in over ~1.2s (respecting prefers-reduced-motion). See PRD §4.
 */
export default function DmMessage({ firstName }: { firstName?: string }) {
  const reduce = useReducedMotion();
  // The message is built from segments so parts (the name, the income terms)
  // can render bold while the whole thing still types in character by character.
  const name = firstName?.trim();
  // No first name → "Hey — we're looking…" with no "there" placeholder.
  const segments: { text: string; bold?: boolean }[] = [
    ...(name
      ? [{ text: "Hey " }, { text: name, bold: true }]
      : [{ text: "Hey" }]),
    {
      text: ` — we're looking for someone to run the ads for the ${BRAND.name} machine. `,
    },
    { text: "$10k a month base, plus 10% of every sale you bring in", bold: true },
    { text: ". Can you take it?" },
  ];
  const fullText = segments.map((s) => s.text).join("");
  // Fresh instance per screen mount (AnimatePresence keys by step), so the
  // initial value covers the reset — the effect only drives the typing timer.
  const [shown, setShown] = useState(reduce ? fullText.length : 0);

  useEffect(() => {
    if (reduce) return;
    const total = 1200; // ~1.2s
    const stepMs = Math.max(total / fullText.length, 12);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= fullText.length) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [fullText, reduce]);

  const typing = shown < fullText.length;

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 text-sm font-bold text-white">
          {BRAND.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {BRAND.founder} · Founder, {BRAND.name}
          </p>
          <p className="text-xs text-muted-foreground">just now</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <p className="text-[15px] leading-relaxed text-foreground">
          {(() => {
            let start = 0;
            return segments.map((seg, i) => {
              const end = start + seg.text.length;
              const visible = seg.text.slice(0, Math.max(0, Math.min(seg.text.length, shown - start)));
              start = end;
              if (!visible) return null;
              return seg.bold ? (
                <strong key={i} className="font-semibold">
                  {visible}
                </strong>
              ) : (
                <span key={i}>{visible}</span>
              );
            });
          })()}
          {typing ? (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground/60 align-middle" />
          ) : null}
        </p>
      </div>
    </div>
  );
}
