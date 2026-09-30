// OpenAI client — SERVER ONLY. Reads OPENAI_API_KEY, which must never reach the
// client bundle. See spec/02-ARCHITECTURE.md → Security notes.
import OpenAI from "openai";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  cached = new OpenAI({ apiKey });
  return cached;
}
