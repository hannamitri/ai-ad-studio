"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AUDIENCE_OPTIONS, LEVER_OPTIONS, VIBE_OPTIONS } from "@/lib/brief";
import { REFINE_MAX_CHARS } from "@/lib/prompts";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFlow } from "../FlowShell";
import { PLACEHOLDER_AD } from "../placeholderAd";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 12 — Your first ad. See spec/01-PRD.md §4.
const AUDIENCE_CHIP: Record<string, string> = {
  everyone: "Everyone",
  cafe: "Café spenders",
  budget: "Students",
};
const LEVER_CHIP: Record<string, string> = {
  pain: "Pain",
  desire: "Desire",
  speed: "Speed",
};

export default function FirstAd() {
  const { data, update, next } = useFlow();
  const name = data.firstName?.trim();
  const [tweakOpen, setTweakOpen] = useState(false);

  const gen = data.generation;
  // Email login is off for now: the secondary action downloads the PNG
  // directly (ownership is checked against the anon_id cookie).
  const downloadHref = gen
    ? `/api/ads/${gen.adId}/download`
    : PLACEHOLDER_AD.imageSrc;
  // Real creative + copy when present; placeholder otherwise (dev / back-nav).
  const imageUrl = gen?.imageUrl ?? PLACEHOLDER_AD.imageSrc;
  const headline = gen?.concept.headline ?? PLACEHOLDER_AD.headline;
  const primaryText = gen?.concept.primaryText ?? PLACEHOLDER_AD.primaryText;

  const audienceId =
    AUDIENCE_OPTIONS.find((o) => o.id === data.audienceId)?.id ?? "cafe";
  const leverId = LEVER_OPTIONS.find((o) => o.id === data.leverId)?.id ?? "pain";
  const vibe = VIBE_OPTIONS.find((o) => o.id === data.vibeId) ?? VIBE_OPTIONS[0];

  const chips = [AUDIENCE_CHIP[audienceId], LEVER_CHIP[leverId], vibe.label];

  return (
    <>
      <StageLayout
        headline={
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl">
            You just made your first ad{name ? `, ${name}` : ""}.
          </h1>
        }
        body={
          <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
            Your audience, your lever, your look — turned into a finished ad.
            That&apos;s the core loop of performance marketing, and you&apos;ve
            done it once.
          </p>
        }
        visual={
          <div className="w-full">
            <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted">
              <Image
                key={imageUrl}
                src={imageUrl}
                alt="Your generated ad creative"
                fill
                sizes="(max-width: 1023px) 100vw, 560px"
                className="object-cover"
                priority
              />
            </div>
            <h2 className="mt-4 text-lg font-semibold leading-snug text-foreground">
              {headline}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {primaryText}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        }
        visualPanel={false}
        primary={
          <div className="flex flex-col gap-2">
            <div>
              <PrimaryButton onClick={next}>
                See it on Instagram
                <ArrowRight className="ml-1 size-4" strokeWidth={2.5} />
              </PrimaryButton>
              <p className="mt-1.5 text-center text-xs font-medium text-muted-foreground lg:text-left">
                Next step — see your ad live in a real feed.
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Or first:</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTweakOpen(true)}
                disabled={!gen}
                className="h-10 flex-1 rounded-full text-sm font-medium"
              >
                Tweak it
              </Button>
              <a
                href={downloadHref}
                download
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 flex-1 rounded-full text-sm font-medium",
                })}
              >
                Download my ad
              </a>
            </div>
          </div>
        }
      />

      {gen ? (
        <TweakSheet
          open={tweakOpen}
          onClose={() => setTweakOpen(false)}
          adId={gen.adId}
          onRefined={(imageUrl, versionId) =>
            update({
              generation: { ...gen, imageUrl, versionId },
            })
          }
        />
      ) : null}

    </>
  );
}

/** Bottom sheet: one instruction box that refines the ad in place. */
function TweakSheet({
  open,
  onClose,
  adId,
  onRefined,
}: {
  open: boolean;
  onClose: () => void;
  adId: string;
  onRefined: (imageUrl: string, versionId: string) => void;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const instruction = value.trim();
  const canSend = instruction.length > 0 && status !== "saving";

  async function handleSend() {
    if (!canSend) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, instruction }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.imageUrl) {
        setError(json.error ?? "That tweak didn't come out. Try again.");
        setStatus("error");
        return;
      }
      onRefined(json.imageUrl, json.versionId);
      setValue("");
      setStatus("idle");
      onClose();
    } catch {
      setError("That tweak didn't come out. Try again.");
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Tweak your ad"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
            className="relative w-full max-w-[520px] rounded-t-[24px] bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Tweak your ad
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tell it one change — the colours, layout, headline or setting.
            </p>
            <textarea
              value={value}
              autoFocus
              maxLength={REFINE_MAX_CHARS}
              onChange={(e) => {
                setValue(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="e.g. Make the lighting brighter and warmer."
              className="mt-4 min-h-[90px] w-full resize-none rounded-xl border border-border bg-background p-3 text-base outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-ring/40"
            />
            {error ? (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="mt-3 h-14 w-full rounded-full text-base font-semibold"
            >
              {status === "saving" ? "Tweaking…" : "Apply tweak"}
            </Button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
