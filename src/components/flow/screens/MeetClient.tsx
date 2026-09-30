"use client";

import Image from "next/image";
import { BRAND } from "@/lib/brief";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Short brand call-outs shown as small bubbles under the image (Screen 2).
const CALLOUTS = ["Luxury", "Premium", "Coffee Lovers"];

// Screen 2 — Meet the client (the brand). One idea per screen: this frame
// introduces the brand and product; the goal lives on the next frame. See
// spec/01-PRD.md §3 point 1 and §4.
export default function MeetClient() {
  const { next } = useFlow();

  return (
    <StageLayout
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl xl:text-[2.75rem]">
          Meet {BRAND.name} Espresso.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          A premium-grade coffee brand looking to expand.
        </p>
      }
      visual={<ClientCard />}
      primary={
        <PrimaryButton onClick={next}>So what do they need?</PrimaryButton>
      }
    />
  );
}

function ClientCard() {
  return (
    <div className="w-full">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted">
        <Image
          src="/brief/brand.png"
          alt={`${BRAND.name} brand imagery`}
          fill
          sizes="(max-width: 1023px) 100vw, 560px"
          className="object-cover"
          priority
        />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <span className="rounded-lg bg-black/55 px-2.5 py-1 text-sm font-semibold text-white backdrop-blur-sm">
            {BRAND.product}
          </span>
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow-cta">
            ${BRAND.price}
          </span>
        </div>
      </div>

      {/* Brand call-outs — small accent bubbles under the image. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CALLOUTS.map((callout) => (
          <span
            key={callout}
            className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary"
          >
            {callout}
          </span>
        ))}
      </div>

      {/* The original "Meet Alto" line now sits under the image (PRD §4 Screen 2). */}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        A small Portland company that makes one thing: a home espresso machine
        that pulls café-quality shots. ${BRAND.price}.
      </p>
    </div>
  );
}
