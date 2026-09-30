/**
 * One-off: generate the nine brief images used across the guided flow.
 *
 *   npm run brief-images
 *   # or: npx tsx scripts/generate-brief-images.ts
 *
 * Requires OPENAI_API_KEY and IMAGE_MODEL in .env.local. Writes 1024x1024,
 * quality "medium" PNGs to public/brief/. Costs ~US$0.50 total. Run manually —
 * NEVER at runtime. Images that already exist on disk are skipped.
 *
 * Prompts are copied verbatim from spec/03-PROMPTS.md → "Brief images".
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";

// Load .env.local (then .env as a fallback) so the script mirrors Next.js.
loadEnv({ path: ".env.local" });
loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.IMAGE_MODEL;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}
if (!IMAGE_MODEL) {
  console.error("Missing IMAGE_MODEL in .env.local");
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), "public", "brief");

// Appended to every prompt except the app icon (spec: "All: photorealistic,
// no people's faces, no text, no logos.").
const COMMON = "Photorealistic, no people's faces, no text, no logos.";

const IMAGES: { name: string; prompt: string }[] = [
  {
    name: "brand",
    prompt: `A compact, beautifully designed home espresso machine in brushed steel and matte black on a light wooden kitchen bench, morning sunlight through a window, a fresh shot in a small ceramic cup beside it, soft steam. ${COMMON}`,
  },
  {
    name: "product",
    prompt: `Studio product photograph of a compact premium home espresso machine, brushed steel and matte black, three-quarter angle, on a neutral surface with soft light and a gentle reflection. ${COMMON}`,
  },
  {
    name: "aud-everyone",
    prompt: `A busy chain-café counter seen from the queue, many takeaway cups, bright flat lighting, generic and crowded. ${COMMON}`,
  },
  {
    name: "aud-cafe",
    prompt: `A well-kept modern kitchen counter with a burr coffee grinder, a pour-over set, a bag of specialty beans and a digital scale, warm daylight, considered and tidy. ${COMMON}`,
  },
  {
    name: "aud-budget",
    prompt: `A student dorm desk with a laptop, textbooks, a jar of instant coffee and a chipped mug, daylight, casual and cluttered. ${COMMON}`,
  },
  {
    name: "vibe-warm",
    prompt: `Espresso advertisement mock-up: espresso machine on a wooden bench in warm morning light, steam rising from a cup, soft shadows, space left for a headline. ${COMMON}`,
  },
  {
    name: "vibe-bold",
    prompt: `Espresso advertisement mock-up: espresso machine on a dark charcoal background with hard directional light and strong metallic highlights, graphic composition, space left for a large headline. ${COMMON}`,
  },
  {
    name: "vibe-minimal",
    prompt: `Espresso advertisement mock-up: espresso machine alone on an off-white background, tiny shadow, huge negative space. ${COMMON}`,
  },
  {
    name: "icon",
    prompt:
      "App icon: a rounded square in a warm orange, with a simple white abstract spark glyph in the centre, flat design, no text.",
  },
];

async function main() {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  await mkdir(OUT_DIR, { recursive: true });

  const pending = IMAGES.filter(
    ({ name }) => !existsSync(path.join(OUT_DIR, `${name}.png`)),
  );
  const skipped = IMAGES.length - pending.length;

  console.log(
    `Generating ${pending.length} brief image(s) with "${IMAGE_MODEL}" → ${OUT_DIR}` +
      (skipped ? ` (skipping ${skipped} already on disk)` : ""),
  );

  for (const { name, prompt } of pending) {
    process.stdout.write(`  • ${name}.png … `);
    const result = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: "medium",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(`No image data returned for "${name}".`);
    }

    const outPath = path.join(OUT_DIR, `${name}.png`);
    await writeFile(outPath, Buffer.from(b64, "base64"));
    console.log("done");
  }

  console.log(
    pending.length
      ? `Wrote ${pending.length} image(s) to public/brief/.`
      : "Nothing to do — all nine brief images already exist.",
  );
}

main().catch((err) => {
  console.error("\nBrief image generation failed:");
  console.error(err);
  process.exit(1);
});
