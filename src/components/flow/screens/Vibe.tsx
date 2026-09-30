"use client";

import { VIBE_OPTIONS } from "@/lib/brief";
import OptionCards, { type CardOption } from "../OptionCards";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 7 — Q3: How should it look? See spec/01-PRD.md §4.
const OPTIONS: CardOption[] = VIBE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
  sub: o.sub,
  img: o.img,
}));

export default function Vibe() {
  const { data, next, update } = useFlow();
  const selectedId = data.vibeId;

  return (
    <StageLayout
      layout="centered"
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-3xl">
          Third call: how should it look?
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          People decide whether to stop scrolling in about half a second, before
          they&apos;ve read anything. The look does the first job.
        </p>
      }
      primary={
        <PrimaryButton onClick={next} disabled={!selectedId}>
          Lock it in
        </PrimaryButton>
      }
    >
      <OptionCards
        aria-label="Vibe"
        options={OPTIONS}
        selectedId={selectedId}
        onSelect={(o) => update({ vibeId: o.id })}
      />
    </StageLayout>
  );
}
