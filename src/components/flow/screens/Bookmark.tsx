"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const HINTS: Record<Platform, string> = {
  ios: "Tap Share then Add to Home Screen",
  android: "Tap ⋮ then Add to Home screen",
  desktop: "Press ⌘D (Mac) or Ctrl+D (Windows)",
};

const emptySubscribe = () => () => {};

// Screen 8 — The bookmark moment. See spec/01-PRD.md §4.
export default function Bookmark() {
  const { next } = useFlow();
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [platform] = useState<Platform | null>(() =>
    typeof navigator === "undefined" ? null : detectPlatform(),
  );
  const studioUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/studio`
      : "/studio";
  const studioLabel = studioUrl.replace(/^https?:\/\//, "");

  return (
    <StageLayout
      layout="centered"
      centeredMaxWidth="max-w-[440px]"
      headline={
        <h1 className="text-center text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-3xl">
          You&apos;re about to open the actual software.
        </h1>
      }
      body={
        <p className="text-center text-base leading-relaxed text-muted-foreground text-pretty">
          Marketers use this on real brands. Bookmark it now so it&apos;s yours
          after today.
        </p>
      }
      primary={
        <PrimaryButton onClick={next}>Open the software</PrimaryButton>
      }
    >
      <div className="flex flex-col items-center">
        <div className="relative size-24 overflow-hidden rounded-[22px] shadow-card lg:size-28">
          <Image
            src="/brief/icon.png"
            alt="AI Ad Studio app icon"
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>

        <span className="mt-4 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
          {studioLabel}
        </span>

        {hydrated && platform ? (
          <div className="mt-5 w-full rounded-[var(--radius-card)] border border-border bg-card px-4 py-3 text-center text-sm text-foreground">
            {HINTS[platform]}
          </div>
        ) : null}
      </div>
    </StageLayout>
  );
}
