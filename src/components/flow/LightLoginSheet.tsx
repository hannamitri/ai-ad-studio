"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFlow } from "./FlowShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A light-login bottom sheet (PRD §4 Screens 11 + 13, §7 "bottom sheets only").
 * Collects an email, creates the account via POST /api/session (attaching this
 * device's anonymous ads), then shows a "Saved ✓" state. Pre-fills from ?e= or
 * a previously saved email.
 */
export default function LightLoginSheet({
  open,
  onClose,
  title,
  body,
  cta = "Save",
  attachAnon = true,
  successTitle = "Saved ✓",
  successBody,
  doneLabel = "Done",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  cta?: string;
  /** Re-parent this device's anonymous ads to the new account. */
  attachAnon?: boolean;
  successTitle?: string;
  successBody?: string;
  doneLabel?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
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
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
            className="relative w-full max-w-[520px] rounded-t-[24px] bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            {/* Mounted only while open, so its state resets on each open. */}
            <SheetBody
              title={title}
              body={body}
              cta={cta}
              attachAnon={attachAnon}
              successTitle={successTitle}
              successBody={successBody}
              doneLabel={doneLabel}
              onClose={onClose}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function SheetBody({
  title,
  body,
  cta,
  attachAnon,
  successTitle,
  successBody,
  doneLabel,
  onClose,
}: {
  title: string;
  body?: string;
  cta: string;
  attachAnon: boolean;
  successTitle: string;
  successBody?: string;
  doneLabel: string;
  onClose: () => void;
}) {
  const { data, update } = useFlow();
  const [value, setValue] = useState(data.savedEmail ?? data.emailPrefill ?? "");
  const [saved, setSaved] = useState(Boolean(data.savedEmail));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const email = value.trim();
  const valid = EMAIL_RE.test(email);

  async function handleSave() {
    if (!valid || status === "saving") return;
    setStatus("saving");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: data.firstName?.trim() || undefined,
          source:
            data.src === "webinar" || data.src === "call" ? data.src : undefined,
          attachAnon,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      update({ savedEmail: email, identified: true });
      setSaved(true);
    } catch {
      setStatus("error");
    }
  }

  if (saved) {
    return (
      <div className="py-4 text-center">
        <p className="text-lg font-semibold text-foreground">{successTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {successBody ?? `A link to your ads is on its way to ${email}.`}
        </p>
        <Button
          type="button"
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-full text-base font-semibold"
        >
          {doneLabel}
        </Button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        enterKeyHint="go"
        placeholder="you@example.com"
        value={value}
        autoFocus
        onChange={(e) => {
          setValue(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
        className="mt-4 h-14 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-ring/40"
      />
      {status === "error" ? (
        <p className="mt-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      ) : null}
      <Button
        type="button"
        onClick={handleSave}
        disabled={!valid || status === "saving"}
        className="mt-3 h-14 w-full rounded-full text-base font-semibold"
      >
        {status === "saving" ? "Saving…" : cta}
      </Button>
    </>
  );
}
