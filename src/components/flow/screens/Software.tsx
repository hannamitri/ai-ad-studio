"use client";

import { Bookmark as BookmarkIcon } from "lucide-react";
import { useState } from "react";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 9 — The software. See spec/01-PRD.md §4.
export default function Software() {
  const { data, next, update } = useFlow();
  // Pre-filled with the brief only if the clipboard copy failed on Screen 7.
  const [value, setValue] = useState(
    data.clipboardFailed ? data.briefText : "",
  );

  const canGenerate = value.trim().length > 0;

  function handleGenerate() {
    if (!canGenerate) return;
    update({ briefText: value });
    next();
  }

  return (
    <StageLayout
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl">
          Paste your brief and press Generate.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          This is the same screen you&apos;ll come back to for real clients.
        </p>
      }
      visual={
        <div className="w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <BookmarkIcon
              className="size-4 text-primary"
              strokeWidth={1.5}
            />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              AI Ad Studio
            </span>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a client brief, or describe the brand, product, price and audience."
            className="min-h-[220px] w-full resize-none bg-transparent p-4 text-base leading-relaxed outline-none lg:min-h-[280px]"
          />
        </div>
      }
      visualPanel={false}
      primary={
        <PrimaryButton onClick={handleGenerate} disabled={!canGenerate}>
          Generate my ad
        </PrimaryButton>
      }
    />
  );
}
