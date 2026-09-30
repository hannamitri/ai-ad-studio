"use client";

import { useState, useSyncExternalStore } from "react";

type Platform = "ios" | "android" | "desktop";

const DISMISS_KEY = "aas-bookmark-hint-dismissed";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Mac; treat multi-touch Macs as iOS.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const HINTS: Record<Platform, string> = {
  ios: "Tap Share → Add to Home Screen",
  android: "Tap ⋮ → Add to Home screen",
  desktop: "Press ⌘D / Ctrl+D",
};

/**
 * Platform-aware add-to-home-screen hint. Detects iOS / Android / desktop and
 * shows only the relevant line. Dismissible (remembered in localStorage).
 * See spec/01-PRD.md §4 (Screen 5).
 */
const emptySubscribe = () => () => {};

export default function BookmarkHint() {
  // Client-only values read lazily; gated behind `hydrated` to avoid mismatch.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [platform] = useState<Platform | null>(() =>
    typeof navigator === "undefined" ? null : detectPlatform(),
  );
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return typeof localStorage !== "undefined" &&
        localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!hydrated || !platform || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
      <BookmarkIcon className="size-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-sm text-muted-foreground">{HINTS[platform]}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss bookmark hint"
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
