// Shared client types for the studio (PRD §5). The ad concept comes from the
// generate/refine API; versions carry the signed creative URLs.
import type { AdConcept } from "@/types/ad";

export type StudioFormat = "feed" | "story" | "landscape";

/** A single creative version of an ad (v1 = original, v2+ = refinements). */
export type AdVersion = {
  versionId: string;
  version: number;
  imageUrl: string | null;
  instruction: string | null;
};

/** The ad currently open in the studio, plus which version is on screen. */
export type CurrentAd = {
  adId: string;
  concept: AdConcept;
  format: StudioFormat;
  tone: string | null;
  versions: AdVersion[];
  /** Index into `versions` of the version being shown. */
  index: number;
};

/** A version as returned by GET /api/ads. */
export type HistoryVersion = {
  id: string;
  version: number;
  instruction: string | null;
  imageUrl: string | null;
};

/** An ad as returned by GET /api/ads (with its brief text for grouping). */
export type HistoryAd = {
  id: string;
  briefId: string | null;
  briefText: string | null;
  concept: AdConcept;
  format: StudioFormat;
  tone: string | null;
  createdAt: string;
  versions: HistoryVersion[];
};

/** Aspect-ratio Tailwind class for a creative in the given format. */
export function aspectClass(format: StudioFormat): string {
  if (format === "story") return "aspect-[9/16]";
  if (format === "landscape") return "aspect-[1.91/1]";
  return "aspect-square";
}
