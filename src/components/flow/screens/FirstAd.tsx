"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AUDIENCE_OPTIONS, LEVER_OPTIONS, VIBE_OPTIONS } from "@/lib/brief";
import { REFINE_MAX_CHARS } from "@/lib/prompts";
import { Button } from "@/components/ui/button";
import { useFlow } from "../FlowShell";
import LightLoginSheet from "../LightLoginSheet";
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
  const [saveOpen, setSaveOpen] = useState(false);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [toast, setToast] = useState(false);

  // Already identified (via ?e= silent creation or a previous save) → toast.
  // Anonymous → the light-login bottom sheet. See spec/01-PRD.md §4 Screen 11.
  const identified = Boolean(
    data.identified || data.emailPrefill || data.savedEmail,
  );

  function handleSave() {
    if (identified) {
      setToast(true);
    } else {
      setSaveOpen(true);
    }
  }

  const gen = data.generation;
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
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                className="h-10 flex-1 rounded-full text-sm font-medium"
              >
                Save my ad
              </Button>
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

      <LightLoginSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Where should we save it?"
        body="Pop your email in and your ad will be waiting for you."
        cta="Save"
        attachAnon
        successTitle="Saved ✓"
        successBody="A link to your ads is in your inbox."
      />

      <SavedToast
        show={toast}
        message="Saved to your account ✓"
        onDone={() => setToast(false)}
      />
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

/** A brief top toast for already-identified users (no sheet needed). */
function SavedToast({
  show,
  message,
  onDone,
}: {
  show: boolean;
  message: string;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
          className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-card"
        >
          <Check className="size-4" strokeWidth={2.5} />
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
