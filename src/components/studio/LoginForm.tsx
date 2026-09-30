"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Magic-link login for the studio (PRD §5). Two framings, same warm copy:
//   - cold (returning bookmark, no flow cookie): "Welcome back to your studio."
//   - fromFlow (arrived from the guided flow with a flow_uid cookie): a lighter
//     prompt to keep the ads they just made. Both use the light-login line
//     "Enter the email you used and we'll send you a link".
export default function LoginForm({ fromFlow }: { fromFlow: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const valid = EMAIL_RE.test(email.trim());

  async function sendLink() {
    if (!valid || status === "sending") return;
    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio`,
        },
      });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  const heading = fromFlow
    ? "Let's keep your ads."
    : "Welcome back to your studio.";
  const body = fromFlow
    ? "Enter the email you used and we'll send you a link — it brings you straight back to everything you made."
    : "Enter the email you used and we'll send you a link — no password to remember.";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {status === "sent" ? (
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Check your inbox
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
            We sent a link to{" "}
            <span className="font-medium text-foreground">{email.trim()}</span>.
            Tap it and you&apos;ll land straight in your studio.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="mt-6 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {heading}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
            {body}
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="go"
            placeholder="you@example.com"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendLink();
            }}
            className="mt-6 h-14 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-ring/40"
          />
          {status === "error" ? (
            <p className="mt-2 text-sm text-destructive">
              Something went wrong sending your link. Please try again.
            </p>
          ) : null}
          <Button
            type="button"
            onClick={sendLink}
            disabled={!valid || status === "sending"}
            className="mt-3 h-14 w-full rounded-full text-base font-semibold"
          >
            {status === "sending" ? "Sending…" : "Email me a link"}
          </Button>
        </>
      )}
    </main>
  );
}
