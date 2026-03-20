/**
 * Shared Google GenAI client singleton.
 *
 * EFFICIENCY: Avoids re-instantiating GoogleGenAI (which reads env vars and
 * initialises HTTP configuration) on every Gemini call. The singleton is
 * created once and reused across intake parsing, extraction, and live calls.
 *
 * SECURITY: `requireGeminiEnv()` throws at startup if GEMINI_API_KEY is missing —
 * this is intentional fail-fast behaviour so misconfigured deployments surface
 * immediately rather than failing silently on the first user request.
 */
import { GoogleGenAI } from "@google/genai";

import { requireGeminiEnv } from "@/lib/env";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  const { geminiApiKey } = requireGeminiEnv();
  _client = new GoogleGenAI({ apiKey: geminiApiKey });
  return _client;
}
