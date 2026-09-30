"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import VersionSwiper from "./VersionSwiper";
import type { CurrentAd } from "./types";

// The generated creative plus its copy block — hook, headline, primary text and
// CTA — each with a copy-to-clipboard icon. The creative is a VersionSwiper so
// the user can move between versions. See spec/01-PRD.md §5.
export default function ResultCard({
  ad,
  onIndexChange,
}: {
  ad: CurrentAd;
  onIndexChange: (index: number) => void;
}) {
  const { concept } = ad;

  return (
    <div className="flex flex-col gap-4">
      <VersionSwiper
        versions={ad.versions}
        index={ad.index}
        onIndexChange={onIndexChange}
        format={ad.format}
        alt={`${concept.brand.name} ad creative`}
      />

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
        <CopyRow label="Hook" value={concept.hook} />
        <CopyRow label="Headline" value={concept.headline} emphasise />
        <CopyRow label="Primary text" value={concept.primaryText} multiline />
        <CopyRow label="Call to action" value={concept.cta} />
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  emphasise,
  multiline,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 leading-relaxed text-foreground text-pretty",
            emphasise ? "text-lg font-semibold" : "text-sm",
            multiline ? "" : "",
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="size-4 text-primary" strokeWidth={2.5} />
        ) : (
          <Copy className="size-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
