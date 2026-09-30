// Copy constants for the guided flow's generating pause + error states.
// The sample brief itself now lives in src/lib/brief.ts (assembled from the
// prospect's Screen 4–6 choices). AI-facing prompts live in ./ad.
export * from "./ad";

/**
 * Screen 11 loading-state checklist. `label` is the active line, `explainer`
 * is the one-line explainer shown as each step becomes active.
 * Copied verbatim from spec/03-PROMPTS.md → "Loading-state copy (Screen 11)".
 */
export const GENERATING_STEPS: { label: string; explainer?: string }[] = [
  { label: "Reading your brief…" },
  {
    label: "Building the headline from your lever",
    explainer:
      "Working marketers call this the hook. It's the reason someone stops scrolling.",
  },
  {
    label: "Writing the copy",
    explainer: "Headline, primary text, call to action.",
  },
  {
    label: "Designing the creative in your look",
    explainer: "This is the part that used to take a designer a day.",
  },
];

export const GENERATING_FOOTER = "Usually about 20 seconds.";

/**
 * Error copy — final. Copied verbatim from spec/03-PROMPTS.md → "Error copy".
 */
export const ERROR_COPY = {
  generationFailed:
    "That one didn't come out. It happens — tap to try again, it won't count against your free ads.",
  dailyCap:
    "You've used today's free generations — they reset at midnight. Everything you've made is saved right here.",
  capacity:
    "We're at capacity right now. Your seat is saved and the link in your inbox will get you straight back in.",
  clipboardBlocked:
    "Your phone didn't let us copy that — no problem, we've filled it in for you on the next screen.",
} as const;
