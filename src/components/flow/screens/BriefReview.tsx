"use client";

import { ArrowDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  AUDIENCE_OPTIONS,
  LEVER_OPTIONS,
  VIBE_OPTIONS,
  buildBrief,
} from "@/lib/brief";
import { ERROR_COPY } from "@/lib/prompts";
import { Button } from "@/components/ui/button";
import BriefBlocks from "../BriefBlocks";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 8 — Here's the brief you just wrote. See spec/01-PRD.md §4.
export default function BriefReview() {
  const { data, next, update } = useFlow();
  const name = data.firstName?.trim();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  // Resolve the three choices (fall back to sensible defaults if a step was skipped).
  const audience =
    AUDIENCE_OPTIONS.find((o) => o.id === data.audienceId) ??
    AUDIENCE_OPTIONS.find((o) => o.recommended)!;
  const lever =
    LEVER_OPTIONS.find((o) => o.id === data.leverId) ?? LEVER_OPTIONS[0];
  const vibe = VIBE_OPTIONS.find((o) => o.id === data.vibeId) ?? VIBE_OPTIONS[0];

  const briefText = useMemo(
    () => buildBrief(audience, lever, vibe, name),
    [audience, lever, vibe, name],
  );

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(briefText);
        setCopied(true);
        setFailed(false);
        return;
      }
      throw new Error("clipboard-unavailable");
    } catch {
      try {
        const el = fallbackRef.current;
        if (el) {
          el.focus();
          el.select();
          const ok = document.execCommand("copy");
          el.setSelectionRange(0, 0);
          el.blur();
          if (ok) {
            setCopied(true);
            setFailed(false);
            return;
          }
        }
        throw new Error("execcommand-failed");
      } catch {
        // Clipboard blocked entirely: pre-fill the brief on Screen 9.
        update({ clipboardFailed: true, briefText });
        setFailed(true);
      }
    }
  }

  const canContinue = copied || failed;

  return (
    <StageLayout
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl">
          You just wrote the brief{name ? `, ${name}` : ""}.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          Every line below came from a decision you made. Copy it — you&apos;ll
          paste it into the software next.
        </p>
      }
      visual={
        <div className="w-full">
          <BriefBlocks audience={audience} lever={lever} vibe={vibe} />

          {/* Step 1 cue — draws the eye to Copy before Open (PRD §3 point 2). */}
          {!canContinue ? (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                1
              </span>
              Copy the brief first
              <ArrowDown className="size-4 animate-bounce" strokeWidth={2.5} />
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleCopy}
            variant={copied ? "secondary" : "default"}
            className="mt-2 h-14 w-full rounded-full text-base font-semibold"
          >
            {copied ? "Copied ✓" : "Copy brief"}
          </Button>
          {failed ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {ERROR_COPY.clipboardBlocked}
            </p>
          ) : null}
          <textarea
            ref={fallbackRef}
            readOnly
            tabIndex={-1}
            aria-hidden
            defaultValue={briefText}
            className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
          />
        </div>
      }
      visualPanel={false}
      primary={
        <div className="flex flex-col gap-1.5">
          <PrimaryButton
            onClick={next}
            disabled={!canContinue}
            className={
              canContinue
                ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                : undefined
            }
          >
            Open the software →
          </PrimaryButton>
          {canContinue ? (
            <p className="text-xs font-medium text-muted-foreground">
              Brief copied — you&apos;re good to go.
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                2
              </span>
              <span className="lg:hidden">Copy the brief above to unlock this ↑</span>
              <span className="hidden lg:inline">
                Copy the brief on the right to unlock this →
              </span>
            </p>
          )}
        </div>
      }
    />
  );
}
