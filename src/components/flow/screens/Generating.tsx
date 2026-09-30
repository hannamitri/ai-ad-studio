"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ERROR_COPY, GENERATING_FOOTER } from "@/lib/prompts";
import { Button } from "@/components/ui/button";
import GeneratingChecklist from "../GeneratingChecklist";
import { useFlow, type GenerationResult } from "../FlowShell";
import { FlowItem, StageLayout } from "../StageLayout";

// Screen 11 — Generating (the teaching pause). Runs the real POST /api/generate
// SSE stream and ticks the checklist on live events: reading → lever → copy →
// design → done | error. See spec/01-PRD.md §4.

// Map each server step to the checklist "active" count (active-1 = current row).
const STEP_ACTIVE: Record<string, number> = {
  reading: 1,
  lever: 2,
  copy: 3,
  design: 4,
};

export default function Generating() {
  // Advance via `replaceNext` so this transient screen drops out of history —
  // otherwise Back from the next screen lands here (see FlowShell `replaceNext`).
  const { data, update, replaceNext, back } = useFlow();
  const [active, setActive] = useState(1); // "Reading your brief…" from the off
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    setActive(1);

    const choices =
      data.audienceId && data.leverId && data.vibeId
        ? {
            audience: data.audienceId,
            lever: data.leverId,
            vibe: data.vibeId,
          }
        : undefined;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefText: data.briefText, choices, format: "feed" }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? ERROR_COPY.generationFailed);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done: GenerationResult | null = null;
      let failure: string | null = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const evt = parseEvent(part);
          if (!evt) continue;
          if (evt.event === "step" && typeof evt.data.step === "string") {
            const next = STEP_ACTIVE[evt.data.step];
            if (next) setActive(next);
          } else if (evt.event === "done") {
            done = evt.data as unknown as GenerationResult;
          } else if (evt.event === "error") {
            failure = (evt.data.message as string) ?? ERROR_COPY.generationFailed;
          }
        }
      }

      if (done) {
        setActive(GENERATING_STEP_COUNT + 1); // all rows ticked
        update({ generation: done });
        replaceNext();
        return;
      }
      setError(failure ?? ERROR_COPY.generationFailed);
    } catch {
      setError(ERROR_COPY.generationFailed);
    }
  }, [data.audienceId, data.leverId, data.vibeId, data.briefText, update, replaceNext]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void run();
  }, [run]);

  if (error) {
    return (
      <StageLayout layout="centered" centeredMaxWidth="max-w-[440px]">
        <div className="flex min-h-full flex-col justify-center py-6 text-center">
          <FlowItem order={0}>
            <p className="text-base leading-relaxed text-foreground text-pretty">
              {error}
            </p>
          </FlowItem>
          <FlowItem order={1} className="mt-6 flex flex-col items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                startedRef.current = true;
                void run();
              }}
              className="h-12 w-full max-w-[280px] rounded-full text-base font-semibold"
            >
              Try again
            </Button>
            <button
              type="button"
              onClick={back}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to the brief
            </button>
          </FlowItem>
        </div>
      </StageLayout>
    );
  }

  return (
    <StageLayout layout="centered" centeredMaxWidth="max-w-[440px]">
      <div className="flex min-h-full flex-col justify-center py-6">
        <GeneratingChecklist active={active} />
        <FlowItem order={5}>
          <p className="mt-8 text-sm text-muted-foreground">{GENERATING_FOOTER}</p>
        </FlowItem>
      </div>
    </StageLayout>
  );
}

const GENERATING_STEP_COUNT = 4;

type ParsedEvent = { event: string; data: Record<string, unknown> };

/** Parse one SSE record ("event: X\ndata: {...}"). */
function parseEvent(record: string): ParsedEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of record.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
