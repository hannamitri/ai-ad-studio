"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFlow } from "./FlowShell";

/**
 * The responsive stage every flow screen renders inside. Implements PRD §7:
 *
 *  - Phone / tablet: a single column; the primary action is pinned to the
 *    bottom of the viewport (safe-area aware), full width, 56px.
 *  - Laptop (≥1024px) `split`: a two-column stage — copy (5/12) on the left
 *    with the primary button inline beneath it, the visual (7/12) on a soft
 *    surface panel on the right, both vertically centred.
 *  - `centered`: a single centred 640px column at every breakpoint (used by the
 *    question screens, the bookmark moment and the generating pause).
 *
 * The frame line + progress dots + Back link are persistent chrome owned by
 * <FlowShell/>; this component only lays out the screen body.
 */
export function StageLayout({
  layout = "split",
  eyebrow,
  headline,
  body,
  visual,
  primary,
  children,
  centeredMaxWidth = "max-w-[640px]",
  visualPanel = true,
}: {
  layout?: "split" | "centered";
  eyebrow?: ReactNode;
  headline?: ReactNode;
  body?: ReactNode;
  /** Right column on laptop / below the copy on phone (split layout only). */
  visual?: ReactNode;
  /** The primary action(s). Inline on laptop split, pinned to the bottom on phone. */
  primary?: ReactNode;
  /** Main content for the `centered` layout (rendered under the copy). */
  children?: ReactNode;
  centeredMaxWidth?: string;
  /** Wrap the split visual in a soft surface panel on laptop. */
  visualPanel?: boolean;
}) {
  if (layout === "centered") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-4 lg:py-8">
          <div className={cn("mx-auto flex w-full flex-col", centeredMaxWidth)}>
            {eyebrow ? (
              <FlowItem order={0} className="mb-2">
                {eyebrow}
              </FlowItem>
            ) : null}
            {headline ? <FlowItem order={1}>{headline}</FlowItem> : null}
            {body ? (
              <FlowItem order={2} className="mt-3">
                {body}
              </FlowItem>
            ) : null}
            {children ? <div className="mt-6">{children}</div> : null}
          </div>
        </div>
        {primary ? (
          <StageFooter>
            <div
              className={cn(
                "mx-auto w-full lg:flex lg:justify-center",
                centeredMaxWidth,
              )}
            >
              {primary}
            </div>
          </StageFooter>
        ) : null}
      </div>
    );
  }

  // Split layout.
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:overflow-visible lg:px-2 lg:py-8">
        {/* Copy column */}
        <div className="flex flex-col lg:col-span-5">
          {eyebrow ? (
            <FlowItem order={0} className="mb-2">
              {eyebrow}
            </FlowItem>
          ) : null}
          {headline ? <FlowItem order={1}>{headline}</FlowItem> : null}
          {body ? (
            <FlowItem
              order={2}
              className="mt-3 max-lg:has-[.desktop-only]:hidden"
            >
              {body}
            </FlowItem>
          ) : null}
          {primary ? (
            <FlowItem order={2} className="mt-8 hidden lg:block">
              {primary}
            </FlowItem>
          ) : null}
        </div>

        {/* Visual column */}
        {visual ? (
          <FlowItem
            order={3}
            className="mt-6 max-lg:has-[.desktop-only]:hidden lg:col-span-7 lg:mt-0 lg:flex lg:justify-center"
          >
            <div
              className={cn(
                "mx-auto w-full max-w-[560px]",
                visualPanel &&
                  "lg:rounded-[var(--radius-card)] lg:bg-card lg:p-8 lg:shadow-card",
              )}
            >
              {visual}
            </div>
          </FlowItem>
        ) : null}
      </div>

      {/* Phone: primary pinned to the bottom of the viewport. */}
      {primary ? <StageFooter className="lg:hidden">{primary}</StageFooter> : null}
    </div>
  );
}

function StageFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Full-width (auto-width on laptop) 56px primary button, per PRD §7. */
export function PrimaryButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-14 w-full rounded-full px-8 text-base font-semibold lg:w-auto lg:min-w-[220px]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A single piece of a screen (headline / body / visual) that fades + rises
 * 12px into place. `order` staggers pieces 60ms apart so the screen assembles
 * top to bottom. Back navigation reverses the rise direction. Respects
 * prefers-reduced-motion. See PRD §3 point 4 / §7.
 */
export function FlowItem({
  children,
  order = 0,
  className,
}: {
  children: ReactNode;
  order?: number;
  className?: string;
}) {
  const { direction } = useFlow();
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 * direction }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.32,
        ease: "easeOut",
        delay: reduce ? 0 : order * 0.06,
      }}
    >
      {children}
    </motion.div>
  );
}
