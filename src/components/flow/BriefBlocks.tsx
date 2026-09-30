"use client";

import {
  Building2,
  Coffee,
  DollarSign,
  ImageIcon,
  Sparkles,
  Target,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { FlowItem } from "./StageLayout";
import {
  AUDIENCE_OPTIONS,
  BRAND,
  type AudienceOption,
  type LeverOption,
  type VibeOption,
} from "@/lib/brief";
import { cn } from "@/lib/utils";

// The brief always uses the recommended audience regardless of the tap.
const AUDIENCE_RECOMMENDED = AUDIENCE_OPTIONS.find((o) => o.recommended)!;

type Block = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** One of the three blocks the prospect chose (Audience, Hook, Look). */
  chosen?: boolean;
};

/**
 * Screen 8 — the assembled brief as compact labelled blocks. Mirrors
 * buildBrief(); the three blocks the prospect chose (Audience, Hook, Look) are
 * highlighted in the brand accent with a "you chose this" tag. See PRD §4.
 */
export default function BriefBlocks({
  lever,
  vibe,
}: {
  audience: AudienceOption;
  lever: LeverOption;
  vibe: VibeOption;
}) {
  // The brief always uses the recommended audience (see buildBrief).
  const audience = AUDIENCE_RECOMMENDED;

  const blocks: Block[] = [
    {
      label: "Brand",
      value: `${BRAND.name} — a small espresso company from ${BRAND.city}. Online only.`,
      icon: Building2,
    },
    {
      label: "Product",
      value: `${BRAND.product} — ${BRAND.productLine}.`,
      icon: Coffee,
    },
    {
      label: "Price",
      value: `$${BRAND.price}, free shipping in the US.`,
      icon: DollarSign,
    },
    {
      label: "Audience",
      value: audience.briefText ?? audience.label,
      icon: Users,
      chosen: true,
    },
    {
      label: "Hook",
      value: `“${lever.headline}” — ${lever.briefText}`,
      icon: Sparkles,
      chosen: true,
    },
    {
      label: "Look",
      value: `${vibe.label} — ${vibe.sub}`,
      icon: Wand2,
      chosen: true,
    },
    {
      label: "Goal",
      value: `Target $${BRAND.goalMonthly.toLocaleString()}/month (≈${BRAND.unitsNeeded} machines).`,
      icon: Target,
    },
    {
      label: "Deliverable",
      value: "One Instagram feed ad — image plus copy.",
      icon: ImageIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => (
        <FlowItem key={block.label} order={3 + i}>
          <BriefBlockRow block={block} />
        </FlowItem>
      ))}
    </div>
  );
}

function BriefBlockRow({ block }: { block: Block }) {
  const Icon = block.icon;
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border px-3 py-2.5",
        block.chosen
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          block.chosen
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              block.chosen ? "text-primary" : "text-muted-foreground",
            )}
          >
            {block.label}
          </p>
          {block.chosen ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
              you chose this
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm leading-snug text-foreground">
          {block.value}
        </p>
      </div>
    </div>
  );
}
