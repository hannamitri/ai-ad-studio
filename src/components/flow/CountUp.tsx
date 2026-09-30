"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Counts a number up from 0 to `value` on mount with an ease-out curve.
 * Respects prefers-reduced-motion (jumps straight to the final value).
 * Used on Screen 2 (goal strip) and Screen 13 (payoff numbers).
 */
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 900,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    const dur = reduce ? 0 : durationMs;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = dur <= 0 ? 1 : Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setN(value * eased);
        raf = requestAnimationFrame(tick);
      } else {
        setN(value);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reduce]);

  const shown =
    decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();

  return (
    <>
      {prefix}
      {shown}
      {suffix}
    </>
  );
}
