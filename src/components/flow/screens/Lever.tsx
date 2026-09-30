"use client";

import { LEVER_OPTIONS } from "@/lib/brief";
import OptionCards, { type CardOption, type OptionFeedback } from "../OptionCards";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 6 — Q2: Which lever do you pull? The chosen lever's headline IS the
// ad headline. Each card shows the lever tag + the actual headline, and the
// feedback treats the pick as a deliberate marketer's read. See spec/01-PRD.md §4.
const OPTIONS: CardOption[] = LEVER_OPTIONS.map((o) => ({
  id: o.id,
  label: o.headline,
  tag: o.tag,
}));

export default function Lever() {
  const { data, next, update } = useFlow();
  const selectedId = data.leverId;
  const selected = LEVER_OPTIONS.find((o) => o.id === selectedId);

  const feedback: OptionFeedback | null = selected
    ? { tone: "good", text: selected.feedback }
    : null;

  return (
    <StageLayout
      layout="centered"
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-3xl">
          Second call: which lever do you pull?
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          Pick the reason your customer would click your ad. Which words will
          make them pay attention?
        </p>
      }
      primary={
        <PrimaryButton onClick={next} disabled={!selectedId}>
          Lock it in
        </PrimaryButton>
      }
    >
      <OptionCards
        aria-label="Lever"
        options={OPTIONS}
        selectedId={selectedId}
        onSelect={(o) => update({ leverId: o.id })}
        feedback={feedback}
      />
    </StageLayout>
  );
}
