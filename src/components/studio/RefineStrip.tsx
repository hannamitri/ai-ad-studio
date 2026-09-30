"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { REFINE_MAX_CHARS } from "@/lib/prompts";
import { cn } from "@/lib/utils";

// Chat-style refine input + the four suggestion chips from spec/03-PROMPTS.md.
// Each refinement calls POST /api/refine (handled by the parent) and appends a
// new version. "Different headline" opens an inline text field. See PRD §5.

// Fixed-instruction chips (verbatim from spec/03-PROMPTS.md → "Suggestion chips").
const QUICK_CHIPS: { label: string; instruction: string }[] = [
  { label: "Brighter", instruction: "Make the lighting brighter and warmer." },
  {
    label: "Show the product bigger",
    instruction: "Make the product larger and more central.",
  },
  {
    label: "More premium",
    instruction:
      "Make it feel more premium: darker, moodier lighting and more restrained typography.",
  },
];

export default function RefineStrip({
  onRefine,
  refining,
  error,
}: {
  onRefine: (instruction: string) => void;
  refining: boolean;
  error: string | null;
}) {
  const [value, setValue] = useState("");
  const [headlineOpen, setHeadlineOpen] = useState(false);
  const [headline, setHeadline] = useState("");

  const instruction = value.trim();
  const canSend = instruction.length > 0 && !refining;

  function send(text: string) {
    if (refining) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    onRefine(trimmed);
  }

  function sendHeadline() {
    const h = headline.trim();
    if (!h || refining) return;
    send(`Change the headline text to: '${h}'.`);
    setHeadline("");
    setHeadlineOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Chat-style input. */}
      <div className="flex items-end gap-2 rounded-[var(--radius-card)] border border-border bg-card p-2 shadow-card">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={refining}
          rows={1}
          maxLength={REFINE_MAX_CHARS}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) {
                send(instruction);
                setValue("");
              }
            }
          }}
          placeholder="Tell it what to change"
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => {
            if (!canSend) return;
            send(instruction);
            setValue("");
          }}
          disabled={!canSend}
          aria-label="Send change"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Suggestion chips. */}
      <div className="flex flex-wrap gap-2">
        <Chip disabled={refining} onClick={() => send(QUICK_CHIPS[0].instruction)}>
          {QUICK_CHIPS[0].label}
        </Chip>
        <Chip
          disabled={refining}
          selected={headlineOpen}
          onClick={() => setHeadlineOpen((o) => !o)}
        >
          Different headline
        </Chip>
        <Chip disabled={refining} onClick={() => send(QUICK_CHIPS[1].instruction)}>
          {QUICK_CHIPS[1].label}
        </Chip>
        <Chip disabled={refining} onClick={() => send(QUICK_CHIPS[2].instruction)}>
          {QUICK_CHIPS[2].label}
        </Chip>
      </div>

      {/* Inline field for "Different headline". */}
      {headlineOpen ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={headline}
            autoFocus
            disabled={refining}
            maxLength={40}
            onChange={(e) => setHeadline(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendHeadline();
            }}
            placeholder="Type the new headline"
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-base outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="button"
            onClick={sendHeadline}
            disabled={!headline.trim() || refining}
            className="flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      ) : null}

      {refining ? (
        <p className="text-sm text-muted-foreground">Applying your change…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[40px] items-center rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50",
        selected
          ? "border-primary bg-primary/[0.08] text-foreground ring-2 ring-primary/40"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
