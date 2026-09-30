"use client";

import { useState } from "react";
import InstagramPost, { type InstagramFormat } from "@/components/InstagramPost";
import { cn } from "@/lib/utils";
import { useFlow } from "../FlowShell";
import { PLACEHOLDER_AD } from "../placeholderAd";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 13 — Live on Instagram. See spec/01-PRD.md §4 and §6.
export default function Instagram() {
  const { data, next } = useFlow();
  const [format, setFormat] = useState<InstagramFormat>("feed");

  // Real creative + copy when present; placeholder otherwise (dev / back-nav).
  const gen = data.generation;
  const brandName = gen?.concept.brand.name ?? PLACEHOLDER_AD.brand.name;
  const brandInitials = gen?.concept.brand.initials ?? PLACEHOLDER_AD.brand.initials;
  const handle = gen?.concept.brand.handle ?? PLACEHOLDER_AD.brand.handle;
  const creativeUrl = gen?.imageUrl ?? PLACEHOLDER_AD.imageSrc;
  const caption = gen?.concept.primaryText ?? PLACEHOLDER_AD.primaryText;
  const ctaLabel = gen?.concept.cta ?? PLACEHOLDER_AD.cta;
  const likes = gen?.concept.socialProof.likes ?? PLACEHOLDER_AD.likes;

  return (
    <StageLayout
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl">
          Here&apos;s how it looks in the feed.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          Same ad, real context. This is what a stranger scrolling at 9pm would
          see.
        </p>
      }
      visual={
        <div className="w-full">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-muted p-1">
              {(["feed", "story"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "h-9 rounded-full px-5 text-sm font-medium capitalize transition-colors",
                    format === f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <InstagramPost
            brandName={brandName}
            brandInitials={brandInitials}
            handle={handle}
            creativeUrl={creativeUrl}
            caption={caption}
            ctaLabel={ctaLabel}
            likes={likes}
            format={format}
          />
        </div>
      }
      visualPanel={false}
      primary={
        <PrimaryButton onClick={next}>What could this ad do?</PrimaryButton>
      }
    />
  );
}
