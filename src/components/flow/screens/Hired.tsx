"use client";

import DmMessage from "../DmMessage";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 3 — You've been hired. See spec/01-PRD.md §4.
export default function Hired() {
  const { data, next } = useFlow();

  return (
    <StageLayout
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl xl:text-[2.75rem]">
          They&apos;ve hired you.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          This is what the first message from a client looks like.
        </p>
      }
      visual={<DmMessage firstName={data.firstName} />}
      visualPanel={false}
      primary={<PrimaryButton onClick={next}>I&apos;m in</PrimaryButton>}
    />
  );
}
