/**
 * Shared Google GenAI client singleton.
 * Avoids re-instantiating the client on every API call.
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
