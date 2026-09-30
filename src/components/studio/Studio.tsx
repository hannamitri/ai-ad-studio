"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Download, Eye, LogOut, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import BookmarkHint from "@/components/BookmarkHint";
import InstagramPost, {
  type InstagramFormat,
} from "@/components/InstagramPost";
import GeneratingChecklist from "@/components/flow/GeneratingChecklist";
import { copyText } from "@/lib/clipboard";
import { ERROR_COPY, GENERATING_FOOTER } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import BriefInput from "./BriefInput";
import HistoryDrawer from "./HistoryDrawer";
import RefineStrip from "./RefineStrip";
import ResultCard from "./ResultCard";
import type { AdConcept } from "@/types/ad";
import type { CurrentAd, HistoryAd, StudioFormat } from "./types";

// The bookmarkable studio tool (PRD §5). Reuses the Phase 3 API routes:
// POST /api/generate (SSE), POST /api/refine, GET /api/ads,
// GET /api/ads/[id]/download. Single column on phone; input-left / result-right
// two-column stage on laptop (PRD §7).

type Phase = "idle" | "generating" | "result" | "error";
type GenError = { message: string; kind: "cap" | "capacity" | "error" };

/** The payload of the generate `done` SSE event. */
type GenDone = {
  adId: string;
  versionId: string;
  imageUrl: string;
  concept: AdConcept;
};

// Map each server SSE step to the checklist "active" count (active-1 = current).
const STEP_ACTIVE: Record<string, number> = {
  reading: 1,
  lever: 2,
  copy: 3,
  design: 4,
};
const GENERATING_STEP_COUNT = 4;

const BOOKMARK_FLAG = "aas-studio-bookmark-shown";

const emptySubscribe = () => () => {};

export default function Studio({
  email,
  programUrl,
}: {
  email: string;
  programUrl: string;
}) {
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<StudioFormat>("feed");
  const [tone, setTone] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [active, setActive] = useState(1);
  const [genError, setGenError] = useState<GenError | null>(null);
  const [current, setCurrent] = useState<CurrentAd | null>(null);

  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // BookmarkHint once per device, on first visit (localStorage flag). PRD §5.
  // Computed lazily and gated behind `hydrated` to avoid a server/client
  // mismatch; the flag is written in an effect (no setState there).
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [firstVisit] = useState(() => {
    try {
      return (
        typeof localStorage !== "undefined" &&
        localStorage.getItem(BOOKMARK_FLAG) !== "1"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!firstVisit) return;
    try {
      localStorage.setItem(BOOKMARK_FLAG, "1");
    } catch {
      // ignore storage failures
    }
  }, [firstVisit]);
  const showHint = hydrated && firstVisit;

  function flashToast(message: string) {
    setToast(message);
  }

  async function runGenerate() {
    const briefText = brief.trim();
    if (!briefText) return;
    setGenError(null);
    setPhase("generating");
    setActive(1);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefText,
          format,
          tone: tone ?? undefined,
        }),
      });

      // Rate-limit / kill-switch / validation failures return JSON, not a stream.
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        const reason = json.reason as string | undefined;
        setGenError({
          message: json.error ?? ERROR_COPY.generationFailed,
          kind:
            reason === "cap"
              ? "cap"
              : reason === "capacity"
                ? "capacity"
                : "error",
        });
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done: GenDone | null = null;
      let buffer = "";
      let failure: string | null = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const evt = parseEvent(part);
          if (!evt) continue;
          if (evt.event === "step" && typeof evt.data.step === "string") {
            const nextActive = STEP_ACTIVE[evt.data.step];
            if (nextActive) setActive(nextActive);
          } else if (evt.event === "done") {
            done = evt.data as unknown as GenDone;
          } else if (evt.event === "error") {
            failure = (evt.data.message as string) ?? ERROR_COPY.generationFailed;
          }
        }
      }

      if (done) {
        setActive(GENERATING_STEP_COUNT + 1);
        setCurrent({
          adId: done.adId,
          concept: done.concept,
          format,
          tone,
          versions: [
            {
              versionId: done.versionId,
              version: 1,
              imageUrl: done.imageUrl,
              instruction: null,
            },
          ],
          index: 0,
        });
        setPhase("result");
        setHistoryRefresh((n) => n + 1);
        return;
      }

      setGenError({
        message: failure ?? ERROR_COPY.generationFailed,
        kind: "error",
      });
      setPhase("error");
    } catch {
      setGenError({ message: ERROR_COPY.generationFailed, kind: "error" });
      setPhase("error");
    }
  }

  async function runRefine(instruction: string) {
    if (!current || refining) return;
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: current.adId, instruction }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.imageUrl) {
        setRefineError(
          json.error ?? "That tweak didn't come out. Try again.",
        );
        return;
      }
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              versions: [
                ...prev.versions,
                {
                  versionId: json.versionId,
                  version: json.version,
                  imageUrl: json.imageUrl,
                  instruction,
                },
              ],
              index: prev.versions.length,
            }
          : prev,
      );
      setHistoryRefresh((n) => n + 1);
    } catch {
      setRefineError("That tweak didn't come out. Try again.");
    } finally {
      setRefining(false);
    }
  }

  function reopen(ad: HistoryAd) {
    const versions = ad.versions.map((v) => ({
      versionId: v.id,
      version: v.version,
      imageUrl: v.imageUrl,
      instruction: v.instruction,
    }));
    setCurrent({
      adId: ad.id,
      concept: ad.concept,
      format: ad.format,
      tone: ad.tone,
      versions,
      index: Math.max(versions.length - 1, 0),
    });
    setBrief(ad.briefText ?? "");
    setFormat(ad.format);
    setTone(ad.tone);
    setRefineError(null);
    setGenError(null);
    setPhase("result");
    setHistoryOpen(false);
  }

  function startAgain() {
    setCurrent(null);
    setBrief("");
    setTone(null);
    setFormat("feed");
    setGenError(null);
    setRefineError(null);
    setPhase("idle");
  }

  async function saveCopyAsText() {
    if (!current) return;
    const c = current.concept;
    const text = `${c.hook}\n\n${c.headline}\n\n${c.primaryText}\n\nCTA: ${c.cta}`;
    const ok = await copyText(text);
    flashToast(ok ? "Copy saved to clipboard ✓" : "Couldn't copy — try again");
  }

  const currentVersion = current?.versions[current.index];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <TopBar
        email={email}
        onMyAds={() => setHistoryOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 lg:px-12 lg:py-10">
        {showHint ? (
          <div className="mb-6">
            <BookmarkHint />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          {/* Input column */}
          <div className="lg:col-span-5">
            <BriefInput
              value={brief}
              onChange={setBrief}
              format={format}
              onFormatChange={setFormat}
              tone={tone}
              onToneChange={setTone}
              onGenerate={runGenerate}
              generating={phase === "generating"}
            />
          </div>

          {/* Result column */}
          <div className="lg:col-span-7">
            {phase === "generating" ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-card">
                <GeneratingChecklist active={active} />
                <p className="mt-8 text-sm text-muted-foreground">
                  {GENERATING_FOOTER}
                </p>
              </div>
            ) : phase === "error" && genError ? (
              <ErrorPanel
                error={genError}
                programUrl={programUrl}
                onRetry={runGenerate}
                onDismiss={() => {
                  setGenError(null);
                  setPhase(current ? "result" : "idle");
                }}
              />
            ) : phase === "result" && current ? (
              <div className="flex flex-col gap-5">
                <ResultCard
                  ad={current}
                  onIndexChange={(index) =>
                    setCurrent((prev) => (prev ? { ...prev, index } : prev))
                  }
                />
                <RefineStrip
                  onRefine={runRefine}
                  refining={refining}
                  error={refineError}
                />
                <ActionsRow
                  onPreview={() => setPreviewOpen(true)}
                  downloadHref={`/api/ads/${current.adId}/download?v=${currentVersion?.version ?? 1}`}
                  onSaveText={saveCopyAsText}
                  onStartAgain={startAgain}
                />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </main>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReopen={reopen}
        refreshKey={historyRefresh}
      />

      {current && currentVersion?.imageUrl ? (
        <PreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          concept={current.concept}
          creativeUrl={currentVersion.imageUrl}
        />
      ) : null}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------- Top bar -- */

function TopBar({ email, onMyAds }: { email: string; onMyAds: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-5 lg:px-12">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" strokeWidth={2} />
          <span className="text-base font-semibold tracking-tight">
            AI Ad Studio
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onMyAds}
            className="h-9 rounded-full px-4 text-sm font-medium"
          >
            My ads
          </Button>
          <AccountMenu email={email} />
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // ignore — navigate regardless
    }
    router.push("/studio/login");
    router.refresh();
  }

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
      >
        {initial}
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium text-foreground">
                {email || "your account"}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <LogOut className="size-4" strokeWidth={2} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- Sections -- */

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <Sparkles className="size-6 text-muted-foreground" strokeWidth={1.75} />
      <p className="mt-3 text-base font-medium text-foreground">
        Your ad will appear here.
      </p>
      <p className="mt-1 max-w-[320px] text-sm text-muted-foreground text-pretty">
        Paste a brief on the left and press Generate — the creative and copy
        land here in about 20 seconds.
      </p>
    </div>
  );
}

function ErrorPanel({
  error,
  programUrl,
  onRetry,
  onDismiss,
}: {
  error: GenError;
  programUrl: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-border bg-card px-6 py-10 text-center shadow-card">
      <p className="max-w-[380px] text-base leading-relaxed text-foreground text-pretty">
        {error.message}
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        {error.kind === "error" ? (
          <Button
            type="button"
            onClick={onRetry}
            className="h-12 w-full max-w-[280px] rounded-full text-base font-semibold"
          >
            Try again
          </Button>
        ) : null}
        {error.kind === "cap" ? (
          <a
            href={programUrl || "#"}
            className="flex h-12 w-full max-w-[280px] items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-cta transition-colors hover:bg-primary/80"
          >
            See the program
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ActionsRow({
  onPreview,
  downloadHref,
  onSaveText,
  onStartAgain,
}: {
  onPreview: () => void;
  downloadHref: string;
  onSaveText: () => void;
  onStartAgain: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onPreview}
        className="h-11 flex-1 rounded-full text-sm font-medium"
      >
        <Eye className="size-4" strokeWidth={2} />
        Preview on Instagram
      </Button>
      <a
        href={downloadHref}
        download
        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background text-sm font-medium transition-colors hover:bg-muted"
      >
        <Download className="size-4" strokeWidth={2} />
        Download PNG
      </a>
      <Button
        type="button"
        variant="outline"
        onClick={onSaveText}
        className="h-11 flex-1 rounded-full text-sm font-medium"
      >
        Save copy as text
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onStartAgain}
        className="h-11 flex-1 rounded-full text-sm font-medium"
      >
        <RotateCcw className="size-4" strokeWidth={2} />
        Start again
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------- Preview UI -- */

function PreviewModal({
  open,
  onClose,
  concept,
  creativeUrl,
}: {
  open: boolean;
  onClose: () => void;
  concept: AdConcept;
  creativeUrl: string;
}) {
  const reduce = useReducedMotion();
  const [format, setFormat] = useState<InstagramFormat>("feed");

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Instagram preview"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: "easeOut" }}
            className="relative w-full max-w-[400px]"
          >
            <div className="mb-3 flex justify-center">
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
              brandName={concept.brand.name}
              brandInitials={concept.brand.initials}
              handle={concept.brand.handle}
              creativeUrl={creativeUrl}
              caption={concept.primaryText}
              ctaLabel={concept.cta}
              likes={concept.socialProof.likes}
              format={format}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* ----------------------------------------------------------------- Toast --- */

function Toast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    timer.current = setTimeout(onDone, 2200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
          className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-fit items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-card"
        >
          <Check className="size-4" strokeWidth={2.5} />
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------- Helpers --- */

type ParsedEvent = { event: string; data: Record<string, unknown> };

/** Parse one SSE record ("event: X\ndata: {...}"). */
function parseEvent(record: string): ParsedEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of record.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
