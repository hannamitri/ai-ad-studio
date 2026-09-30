"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Payoff as PayoffNumbers } from "@/lib/payoff";
import { cn } from "@/lib/utils";
import type { AdConcept } from "@/types/ad";
import Welcome from "./screens/Welcome";
import MeetClient from "./screens/MeetClient";
import ClientGoal from "./screens/ClientGoal";
import Hired from "./screens/Hired";
import Audience from "./screens/Audience";
import LeverLesson from "./screens/LeverLesson";
import Lever from "./screens/Lever";
import Vibe from "./screens/Vibe";
import BriefReview from "./screens/BriefReview";
import Bookmark from "./screens/Bookmark";
import Software from "./screens/Software";
import Generating from "./screens/Generating";
import FirstAd from "./screens/FirstAd";
import Instagram from "./screens/Instagram";
import Payoff from "./screens/Payoff";

// Bumped to v5 when the brand/goal split re-added a screen (Screen 2 → brand,
// Screen 3 → goal). A stale v4 step index would point at a shifted screen, so
// old state is intentionally dropped.
const STORAGE_KEY = "aas-flow-state-v5";

/** The real ad produced by POST /api/generate (Screen 10 → 11 → 12 → 13). */
export type GenerationResult = {
  adId: string;
  versionId: string;
  imageUrl: string;
  concept: AdConcept;
  payoff: PayoffNumbers;
};

/** Server-provided config (non-secret URLs) surfaced to client screens. */
export type FlowConfig = {
  bookingUrl?: string;
  precallVideoUrl?: string;
};

export type FlowData = {
  /** From ?n= — personalises headlines. */
  firstName?: string;
  /** From ?src= — 'webinar' | 'call'. Drives Screen 13 primary CTA. */
  src?: string;
  /** From ?e= — identifies them silently. */
  emailPrefill?: string;

  /** Q1 (Screen 4): the chosen audience id + whether it was the recommended one. */
  audienceId?: string;
  audienceRecommended?: boolean;
  /** Q2 (Screen 6): the chosen lever id (pain | desire | speed) — the hook. */
  leverId?: string;
  /** Q3 (Screen 7): the chosen vibe id (warm | bold | minimal). */
  vibeId?: string;

  /** The assembled brief text (prefilled on Screen 9 if the clipboard copy failed). */
  briefText: string;
  /** True when Screen 7's clipboard copy failed — fall back to auto-fill on Screen 9. */
  clipboardFailed: boolean;

  /** Email captured via the light-login sheet (Screens 11 / 13). */
  savedEmail?: string;
  /**
   * True once this visitor has an account tied to the flow — either via a
   * silent `?e=` session creation (Screen 9) or a Save/Keep-using email.
   * Drives the "toast instead of sheet" behaviour on Screens 11 / 13.
   */
  identified?: boolean;

  /** The generated ad (concept + signed image URL + payoff) from Screen 10. */
  generation?: GenerationResult;
};

const SCREENS = [
  Welcome, // 0 · Screen 1
  MeetClient, // 1 · Screen 2 (brand)
  ClientGoal, // 2 · Screen 3 (goal)
  Hired, // 3 · Screen 4
  Audience, // 4 · Screen 5 (Q1)
  LeverLesson, // 5 · Screen 6 (the attention lesson)
  Lever, // 6 · Screen 7 (Q2)
  Vibe, // 7 · Screen 8 (Q3)
  BriefReview, // 8 · Screen 9
  Bookmark, // 9 · Screen 10
  Software, // 10 · Screen 11
  Generating, // 11 · Screen 12
  FirstAd, // 12 · Screen 13
  Instagram, // 13 · Screen 14
  Payoff, // 14 · Screen 15
] as const;

export const TOTAL_STEPS = SCREENS.length;

/** The transient generating pause — auto-advances and drops out of history. */
const GENERATING_STEP = 11;

type FlowContextValue = {
  step: number;
  totalSteps: number;
  /** 1 = moving forward, -1 = moving back (drives the enter direction). */
  direction: number;
  data: FlowData;
  config: FlowConfig;
  update: (partial: Partial<FlowData>) => void;
  next: () => void;
  /**
   * Advance one step but *replace* the current history entry instead of
   * pushing a new one. Used by the transient Generating screen so it never
   * becomes a browser-back target and traps the user.
   */
  replaceNext: () => void;
  back: () => void;
  goTo: (step: number) => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within <FlowShell/>");
  return ctx;
}

const DEFAULT_DATA: FlowData = {
  briefText: "",
  clipboardFailed: false,
};

const emptySubscribe = () => () => {};

function readStoredState(): { step?: number; data?: Partial<FlowData> } | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

export default function FlowShell({ config = {} }: { config?: FlowConfig }) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  // A one-shot fresh-start entry: `/start?restart=1` (or `?reset=1`) ignores any
  // saved progress and begins at Screen 1. The flag is stripped from the URL in
  // an effect below so a later refresh doesn't keep wiping progress mid-flow.
  const wantsRestart =
    searchParams.get("restart") === "1" || searchParams.get("reset") === "1";

  // True once the client has hydrated. Avoids server/client mismatch while
  // still letting us restore from localStorage without a setState-in-effect.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Lazily restore step + data (localStorage merged with URL params). These
  // are only rendered once `hydrated` flips true, so no hydration mismatch.
  const [step, setStep] = useState<number>(() => {
    if (wantsRestart) return 0;
    const stored = readStoredState();
    return typeof stored?.step === "number"
      ? Math.min(Math.max(stored.step, 0), TOTAL_STEPS - 1)
      : 0;
  });
  const [data, setData] = useState<FlowData>(() => {
    const stored = wantsRestart ? null : readStoredState();
    const n = searchParams.get("n") ?? undefined;
    const src = searchParams.get("src") ?? undefined;
    const e = searchParams.get("e") ?? undefined;
    return {
      ...DEFAULT_DATA,
      ...(stored?.data ?? {}),
      // URL params take precedence when present (a fresh entry link should win).
      firstName: n ?? stored?.data?.firstName,
      src: src ?? stored?.data?.src,
      emailPrefill: e ?? stored?.data?.emailPrefill,
    };
  });

  // 1 = moving forward, -1 = moving back (drives the enter direction).
  const [direction, setDirection] = useState(1);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Strip the one-shot `restart`/`reset` flag from the URL once applied, so a
  // later refresh (now at Screen 1) doesn't re-trigger a wipe as the visitor
  // progresses. Runs before the persist effect writes the fresh step 0.
  useEffect(() => {
    if (!wantsRestart) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("restart");
      url.searchParams.delete("reset");
      window.history.replaceState(
        { flowStep: 0 },
        "",
        url.pathname + url.search + url.hash,
      );
    } catch {
      // Ignore storage/history failures (private mode, quota, etc.).
    }
  }, [wantsRestart]);

  // Persist step + data.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, [step, data]);

  // Sync the step to browser history: one entry per step so the browser
  // back/forward buttons move between screens, driven by `popstate`.
  useEffect(() => {
    if (!hydrated) return;
    // Rebuild a per-step history stack that matches the restored step. A full
    // page reload — or resuming a deep step from localStorage / opening the
    // bookmarked link — collapses the SPA to a single history entry, which left
    // Back with nowhere in-app to go (the reported "back button doesn't work",
    // seen only after a reload/resume). Seed entries for steps 0..current so
    // both the on-screen Back link and the browser Back button can walk back.
    const current = stepRef.current;
    window.history.replaceState({ flowStep: 0 }, "");
    for (let s = 1; s <= current; s += 1) {
      // The transient Generating pause must never be a back target (it
      // auto-advances), so skip it unless it's literally the current screen.
      if (s === GENERATING_STEP && s !== current) continue;
      window.history.pushState({ flowStep: s }, "");
    }
    const onPopState = (e: PopStateEvent) => {
      const target =
        typeof e.state?.flowStep === "number" ? e.state.flowStep : 0;
      const clamped = Math.min(Math.max(target, 0), TOTAL_STEPS - 1);
      setDirection(clamped < stepRef.current ? -1 : 1);
      setStep(clamped);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hydrated]);

  const update = useCallback((partial: Partial<FlowData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Forward moves push a new history entry so browser-back returns here.
  // `replace: true` swaps the current entry instead — used for transient
  // screens that must not be a back target (see `replaceNext`).
  const goToStep = useCallback((target: number, replace = false) => {
    const clamped = Math.min(Math.max(target, 0), TOTAL_STEPS - 1);
    if (clamped === stepRef.current) return;
    setDirection(clamped > stepRef.current ? 1 : -1);
    setStep(clamped);
    try {
      const state = { flowStep: clamped };
      if (replace) window.history.replaceState(state, "");
      else window.history.pushState(state, "");
    } catch {
      // Ignore history failures.
    }
  }, []);

  const goTo = useCallback((step: number) => goToStep(step), [goToStep]);

  const next = useCallback(() => {
    goToStep(stepRef.current + 1);
  }, [goToStep]);

  // Advance while collapsing the current (transient) step out of history, so
  // Back from the next screen skips it entirely.
  const replaceNext = useCallback(() => {
    goToStep(stepRef.current + 1, true);
  }, [goToStep]);

  // Back defers to browser history so the app and the browser stay in sync;
  // `popstate` performs the actual state change.
  const back = useCallback(() => {
    if (stepRef.current <= 0) return;
    window.history.back();
  }, []);

  const ctxValue = useMemo<FlowContextValue>(
    () => ({
      step,
      totalSteps: TOTAL_STEPS,
      direction,
      data,
      config,
      update,
      next,
      replaceNext,
      back,
      goTo,
    }),
    [step, direction, data, config, update, next, replaceNext, back, goTo],
  );

  // Screen-level presence: exit fades out (180ms); the entering screen's
  // pieces fade + rise via <FlowItem>. See PRD §3 point 4 / §7.
  const exitDuration = reduceMotion ? 0 : 0.18;

  // Back is a small text link; hidden on the first screen and the
  // auto-advancing generating pause.
  const showBack = step > 0 && step !== GENERATING_STEP;

  const ScreenComponent = SCREENS[step];

  return (
    <FlowContext.Provider value={ctxValue}>
      <div className="flex min-h-[100dvh] w-full flex-col bg-background">
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-12">
          {/* Persistent chrome: progress dots, frame line, Back. Rendered only
              after hydration so the localStorage-restored step never mismatches
              the server's initial (step 0) render. */}
          <header className="shrink-0 pb-2 lg:pb-4">
            {hydrated ? (
              <div className="flex flex-col items-center gap-2">
                {showBack ? (
                  <button
                    type="button"
                    onClick={back}
                    className="flex h-8 items-center self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    ← Back
                  </button>
                ) : null}
                <ProgressDots step={step} total={TOTAL_STEPS} />
                <p className="text-center text-xs font-medium tracking-tight text-muted-foreground">
                  Your first rep as an AI Performance Marketer · Step {step + 1}{" "}
                  of {TOTAL_STEPS}
                </p>
              </div>
            ) : null}
          </header>

          {/* Animated screen area. The exiting screen fades out, then the new
              screen's pieces fade + rise in (via <FlowItem>). */}
          <main className="relative min-h-0 flex-1">
            {hydrated ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: exitDuration, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <ScreenComponent />
                </motion.div>
              </AnimatePresence>
            ) : null}
          </main>
        </div>
      </div>
    </FlowContext.Provider>
  );
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step + 1}
      aria-label={`Step ${step + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-[220ms]",
            i === step
              ? "w-4 bg-primary"
              : i < step
                ? "w-1.5 bg-foreground/40"
                : "w-1.5 bg-foreground/15",
          )}
        />
      ))}
    </div>
  );
}
