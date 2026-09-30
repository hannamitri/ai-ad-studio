"use client";

import { AUDIENCE_OPTIONS } from "@/lib/brief";
import OptionCards, { type OptionFeedback } from "../OptionCards";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 4 — Q1: Who are we talking to? See spec/01-PRD.md §4.
export default function Audience() {
  const { data, next, update } = useFlow();
  const selectedId = data.audienceId;
  const selected = AUDIENCE_OPTIONS.find((o) => o.id === selectedId);

  const feedback: OptionFeedback | null = selected
    ? {
        tone: selected.recommended ? "good" : "warn",
        text: selected.feedback,
      }
    : null;

  return (
    <StageLayout
      layout="centered"
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-3xl">
          First call: who is this ad for?
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          A $249 machine isn&apos;t for everyone, and pretending it is wastes the
          client&apos;s money. Ads get cheaper the more precisely you aim.
        </p>
      }
      primary={
        <PrimaryButton onClick={next} disabled={!selected}>
          Lock it in
        </PrimaryButton>
      }
    >
      <OptionCards
        aria-label="Audience"
        options={AUDIENCE_OPTIONS}
        selectedId={selectedId}
        onSelect={(o) =>
          update({ audienceId: o.id, audienceRecommended: o.recommended })
        }
        feedback={feedback}
      />
    </StageLayout>
  );
}
