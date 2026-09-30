"use client";

import { useReducedMotion } from "framer-motion";
import { useFlow } from "../FlowShell";
import { PrimaryButton, StageLayout } from "../StageLayout";

// Screen 1 — Welcome. See spec/01-PRD.md §4.
export default function Welcome() {
  const { data, next } = useFlow();
  const reduceMotion = useReducedMotion();
  const name = data.firstName?.trim();

  return (
    <StageLayout
      eyebrow={
        name ? (
          <p className="text-sm font-medium text-muted-foreground">
            Nice one, {name}.
          </p>
        ) : undefined
      }
      headline={
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance lg:text-4xl xl:text-[2.75rem]">
          This is the first step to becoming an AI Performance Marketer.
        </h1>
      }
      body={
        <p className="text-base leading-relaxed text-muted-foreground text-pretty lg:text-lg">
          In the next few minutes you&apos;ll take a real client brief, make the
          calls a marketer makes, and ship a real ad — with the same tools
          working marketers use every day. No experience needed.
        </p>
      }
      visual={<FanningCreatives reduceMotion={!!reduceMotion} />}
      primary={<PrimaryButton onClick={next}>Let&apos;s go</PrimaryButton>}
    />
  );
}

/**
 * Three ad creatives fanning out. The float loop uses a CSS keyframe (not
 * Framer `repeat: Infinity`) so it never blocks the AnimatePresence exit.
 */
function FanningCreatives({ reduceMotion }: { reduceMotion: boolean }) {
  const cards = [
    { rotate: -12, x: -52, bg: "from-rose-400 to-orange-300", delay: "0s" },
    { rotate: 12, x: 52, bg: "from-sky-400 to-indigo-400", delay: "0.4s" },
    { rotate: 0, x: 0, bg: "from-emerald-400 to-teal-300", delay: "0.8s" },
  ];
  return (
    <div className="flex h-52 items-center justify-center lg:h-72" aria-hidden>
      <div className="relative h-44 w-44 lg:h-56 lg:w-56">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.bg} shadow-lg ring-1 ring-black/5`}
            style={{
              transform: `rotate(${c.rotate}deg) translateX(${c.x}px)`,
              transformOrigin: "bottom center",
              animation: reduceMotion
                ? undefined
                : `flow-float 3.5s ease-in-out ${c.delay} infinite`,
            }}
          >
            <div className="flex h-full flex-col justify-end p-4">
              <div className="h-2.5 w-3/4 rounded-full bg-white/70" />
              <div className="mt-2 h-2.5 w-1/2 rounded-full bg-white/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
