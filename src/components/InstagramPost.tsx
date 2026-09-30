"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type InstagramFormat = "feed" | "story";

export type InstagramPostProps = {
  brandName: string;
  brandInitials: string;
  handle?: string;
  creativeUrl: string;
  caption: string;
  ctaLabel: string;
  likes: number;
  format?: InstagramFormat;
};

/**
 * Instagram preview frame — pure HTML/CSS/Tailwind, no external images beyond
 * the creative. Own inline SVG line icons, dark-mode aware, feed + story.
 * See spec/01-PRD.md §6.
 */
export default function InstagramPost({
  brandName,
  brandInitials,
  handle,
  creativeUrl,
  caption,
  ctaLabel,
  likes,
  format = "feed",
}: InstagramPostProps) {
  if (format === "story") {
    return (
      <StoryFrame
        brandName={brandName}
        brandInitials={brandInitials}
        creativeUrl={creativeUrl}
        ctaLabel={ctaLabel}
      />
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Avatar initials={brandInitials} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">
            {handle ?? brandName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Sponsored</p>
        </div>
        <MoreIcon className="size-5 text-zinc-700 dark:text-zinc-300" />
      </div>

      {/* Media */}
      <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={creativeUrl}
          alt={`${brandName} ad creative`}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      </div>

      {/* CTA bar */}
      <button
        type="button"
        className="flex w-full items-center justify-between bg-zinc-100 px-4 py-3 text-sm font-semibold dark:bg-zinc-900"
      >
        <span>{ctaLabel}</span>
        <ChevronIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
      </button>

      {/* Action row */}
      <div className="flex items-center px-3 py-2.5">
        <div className="flex items-center gap-4">
          <HeartIcon className="size-6" />
          <CommentIcon className="size-6" />
          <ShareIcon className="size-6" />
        </div>
        <BookmarkIcon className="ml-auto size-6" />
      </div>

      {/* Likes + caption */}
      <div className="px-3 pb-4">
        <p className="text-sm font-semibold">{likes.toLocaleString()} likes</p>
        <Caption brandName={handle ?? brandName} text={caption} />
      </div>
    </div>
  );
}

function StoryFrame({
  brandName,
  brandInitials,
  creativeUrl,
  ctaLabel,
}: {
  brandName: string;
  brandInitials: string;
  creativeUrl: string;
  ctaLabel: string;
}) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl bg-black">
      {/* Blurred copy of the image fills the 9:16 frame (letterboxing). */}
      <Image
        src={creativeUrl}
        alt=""
        fill
        aria-hidden
        sizes="280px"
        className="scale-110 object-cover blur-xl brightness-75"
      />
      {/* The actual creative, letterboxed. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square w-full">
          <Image
            src={creativeUrl}
            alt={`${brandName} ad creative`}
            fill
            sizes="280px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Top overlay: avatar + name + Sponsored */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 py-3">
        <Avatar initials={brandInitials} small />
        <p className="text-xs font-semibold text-white">{brandName}</p>
        <span className="text-[11px] text-white/70">Sponsored</span>
      </div>

      {/* Bottom CTA */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-8">
        <div className="flex items-center justify-center gap-1 rounded-full bg-white/95 px-4 py-2.5 text-sm font-semibold text-zinc-900">
          <span>{ctaLabel}</span>
          <ChevronIcon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function Caption({ brandName, text }: { brandName: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      className={cn(
        "mt-1 text-sm leading-snug",
        expanded ? "" : "line-clamp-2",
      )}
    >
      <span className="font-semibold">{brandName}</span> {text}
      {expanded ? null : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-1 align-baseline text-zinc-500 dark:text-zinc-400"
        >
          …more
        </button>
      )}
    </p>
  );
}

function Avatar({ initials, small }: { initials: string; small?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]",
        small ? "size-7" : "size-8",
      )}
    >
      <div className="flex size-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {initials}
      </div>
    </div>
  );
}

/* ---- Inline SVG line icons (our own, not Instagram's exact glyphs) ---- */

type IconProps = { className?: string };
const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function HeartIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.5 2.1c0 6.1-8.5 11.6-8.5 11.6Z" />
    </svg>
  );
}

function CommentIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3.5 20.5l1.4-4.7A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <path d="M21.5 3 2.5 9.8l7 2.7 2.7 7L21.5 3Z" />
      <path d="m9.5 12.5 5-5" />
    </svg>
  );
}

function BookmarkIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <path d="M18 21 12 16.5 6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5Z" />
    </svg>
  );
}

function MoreIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </svg>
  );
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} {...svgBase}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
