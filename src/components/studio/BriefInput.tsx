"use client";

import { TONE_MAP } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { StudioFormat } from "./types";

// Studio brief textarea + optional Format / Tone chips + Generate button.
// See spec/01-PRD.md §5. The Generate action streams POST /api/generate (SSE);
// the Studio orchestrator shows the GeneratingChecklist while it runs.

const FORMAT_OPTIONS: { id: StudioFormat; label: string; ratio: string }[] = [
  { id: "feed", label: "Feed", ratio: "1:1" },
  { id: "story", label: "Story", ratio: "9:16" },
  { id: "landscape", label: "Landscape", ratio: "1.91:1" },
];

// Tone chips map to image-prompt guidance via TONE_MAP (spec/03-PROMPTS.md).
const TONE_OPTIONS = Object.keys(TONE_MAP);

export default function BriefInput({
  value,
  onChange,
  format,
  onFormatChange,
  tone,
  onToneChange,
  onGenerate,
  generating,
}: {
  value: string;
  onChange: (value: string) => void;
  format: StudioFormat;
  onFormatChange: (format: StudioFormat) => void;
  tone: string | null;
  onToneChange: (tone: string | null) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const canGenerate = value.trim().length > 0 && !generating;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-card">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={generating}
          maxLength={3000}
          placeholder="Paste a client brief, or describe the brand, product, price and audience."
          className="min-h-[200px] w-full resize-none bg-transparent p-4 text-base leading-relaxed outline-none disabled:opacity-60 lg:min-h-[240px]"
        />
      </div>

      {/* Optional Format chips. */}
      <ChipRow label="Format">
        {FORMAT_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            selected={format === opt.id}
            disabled={generating}
            onClick={() => onFormatChange(opt.id)}
          >
            {opt.label}
            <span className="ml-1.5 text-xs opacity-60">{opt.ratio}</span>
          </Chip>
        ))}
      </ChipRow>

      {/* Optional Tone chips (toggle off by tapping the selected one). */}
      <ChipRow label="Tone">
        {TONE_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            selected={tone === opt}
            disabled={generating}
            onClick={() => onToneChange(tone === opt ? null : opt)}
          >
            {opt}
          </Chip>
        ))}
      </ChipRow>

      <Button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="h-14 w-full rounded-full text-base font-semibold"
      >
        {generating ? "Generating…" : "Generate"}
      </Button>
    </div>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
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
