// ImageProvider interface + OpenAI implementation (Responses API image_generation
// tool). Multi-turn refine via previous_response_id keeps the edit anchored to
// the original creative. See spec/02-ARCHITECTURE.md → Image provider interface.
// SERVER ONLY — uses the OpenAI key via getOpenAI().
import type { ResponseOutputItem, ResponseUsage } from "openai/resources/responses/responses";
import { getOpenAI } from "@/lib/openai";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";

export type ImageResult = {
  png: Buffer;
  /** OpenAI response id — stored on every version as the base for the next tweak. */
  ref: string;
  costEstimateUsd: number;
};

export interface ImageProvider {
  generate(args: {
    prompt: string;
    size: ImageSize;
    quality: ImageQuality;
  }): Promise<ImageResult>;
  refine(args: { previousRef: string; instruction: string }): Promise<ImageResult>;
}

// Rough token pricing for a cost estimate from response.usage (USD per token).
// Approximate — used only for the per-version spend log, never for arithmetic
// the prospect sees. Tune when real pricing is known.
const INPUT_TOKEN_USD = 0.15 / 1_000_000;
const OUTPUT_TOKEN_USD = 12 / 1_000_000;

function estimateCost(usage: ResponseUsage | undefined): number {
  if (!usage) return 0;
  const cost =
    usage.input_tokens * INPUT_TOKEN_USD + usage.output_tokens * OUTPUT_TOKEN_USD;
  return Math.round(cost * 10_000) / 10_000;
}

function extractImage(output: ResponseOutputItem[]): string {
  const call = output.find((o) => o.type === "image_generation_call");
  if (!call || call.type !== "image_generation_call" || !call.result) {
    throw new Error("Image provider returned no image.");
  }
  return call.result; // base64 PNG
}

class OpenAIImageProvider implements ImageProvider {
  async generate({
    prompt,
    size,
    quality,
  }: {
    prompt: string;
    size: ImageSize;
    quality: ImageQuality;
  }): Promise<ImageResult> {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: process.env.TEXT_MODEL!,
      input: prompt,
      tools: [
        {
          type: "image_generation",
          model: process.env.IMAGE_MODEL,
          size,
          quality,
          output_format: "png",
        },
      ],
    });

    const b64 = extractImage(response.output);
    return {
      png: Buffer.from(b64, "base64"),
      ref: response.id,
      costEstimateUsd: estimateCost(response.usage),
    };
  }

  async refine({
    previousRef,
    instruction,
  }: {
    previousRef: string;
    instruction: string;
  }): Promise<ImageResult> {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: process.env.TEXT_MODEL!,
      previous_response_id: previousRef,
      input: instruction,
      tools: [
        {
          type: "image_generation",
          model: process.env.IMAGE_MODEL,
          quality: "medium",
          output_format: "png",
        },
      ],
    });

    const b64 = extractImage(response.output);
    return {
      png: Buffer.from(b64, "base64"),
      ref: response.id,
      costEstimateUsd: estimateCost(response.usage),
    };
  }
}

let cached: ImageProvider | null = null;

/** The configured image provider (OpenAI for now; Gemini later via IMAGE_PROVIDER). */
export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  // IMAGE_PROVIDER=gemini would swap the impl here in a later phase.
  cached = new OpenAIImageProvider();
  return cached;
}

/** Map an ad format to the image size the provider should render. */
export function sizeForFormat(format: string | undefined): ImageSize {
  if (format === "story") return "1024x1536";
  if (format === "landscape") return "1536x1024";
  return "1024x1024";
}
