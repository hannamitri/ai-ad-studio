"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { aspectClass, type HistoryAd } from "./types";

// "My ads" drawer: GET /api/ads, grouped by brief, thumbnails via signed URLs.
// Tap an ad to reopen it (with all its versions). See spec/01-PRD.md §5.
type Group = { key: string; briefText: string | null; ads: HistoryAd[] };

export default function HistoryDrawer({
  open,
  onClose,
  onReopen,
  refreshKey,
}: {
  open: boolean;
  onClose: () => void;
  onReopen: (ad: HistoryAd) => void;
  /** Bumping this while open triggers a refetch (e.g. after a new generation). */
  refreshKey: number;
}) {
  const reduce = useReducedMotion();
  const [ads, setAds] = useState<HistoryAd[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ads", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(true);
        return;
      }
      setError(false);
      setAds((json.ads as HistoryAd[]) ?? []);
    } catch {
      setError(true);
    }
  }, []);

  // Fetch when the drawer opens (and when refreshKey changes while open).
  // Deferred to a timer so the fetch's setState never fires synchronously in
  // the effect body.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [open, refreshKey, load]);

  const groups = groupByBrief(ads ?? []);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
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
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="My ads"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
            className="relative flex h-full w-full max-w-[440px] flex-col bg-background shadow-card"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight">My ads</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {error ? (
                <EmptyLine>
                  Couldn&apos;t load your ads.{" "}
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Try again
                  </button>
                </EmptyLine>
              ) : ads === null ? (
                <EmptyLine>Loading your ads…</EmptyLine>
              ) : ads.length === 0 ? (
                <EmptyLine>
                  No ads yet. Generate your first one to see it here.
                </EmptyLine>
              ) : (
                <div className="flex flex-col gap-6">
                  {groups.map((group) => (
                    <section key={group.key} className="flex flex-col gap-3">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-muted-foreground">
                        {briefSnippet(group.briefText)}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {group.ads.map((ad) => (
                          <AdThumb
                            key={ad.id}
                            ad={ad}
                            onClick={() => onReopen(ad)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function AdThumb({ ad, onClick }: { ad: HistoryAd; onClick: () => void }) {
  const latest = ad.versions[ad.versions.length - 1];
  const thumb = latest?.imageUrl ?? ad.versions[0]?.imageUrl ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card text-left transition-colors hover:border-foreground/30"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted",
          aspectClass(ad.format),
        )}
      >
        {thumb ? (
          <Image
            src={thumb}
            alt={ad.concept.headline || "Ad creative"}
            fill
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-foreground">
          {ad.concept.headline || ad.concept.brand.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ad.versions.length === 1
            ? "1 version"
            : `${ad.versions.length} versions`}
        </p>
      </div>
    </button>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground text-pretty">
      {children}
    </p>
  );
}

function groupByBrief(ads: HistoryAd[]): Group[] {
  const map = new Map<string, Group>();
  for (const ad of ads) {
    const key = ad.briefId ?? ad.id;
    const existing = map.get(key);
    if (existing) {
      existing.ads.push(ad);
    } else {
      map.set(key, { key, briefText: ad.briefText, ads: [ad] });
    }
  }
  return Array.from(map.values());
}

function briefSnippet(text: string | null): string {
  if (!text) return "Untitled brief";
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? text;
  return firstLine.trim();
}
