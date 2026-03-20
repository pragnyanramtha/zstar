# Gemini Integration Guide

Zeppy uses two distinct Gemini APIs. Here's how each one is wired up.

---

## 1. Gemini Live API (Real-time Voice)

**Used for:** The actual outbound phone conversations.

### How it works

The LiveKit voice agent (`src/agent/telephony-agent.ts`) runs as a separate worker process. When a call is dispatched, the worker:

1. Connects to a LiveKit room using the `@livekit/agents` SDK
2. Instantiates `google.beta.realtime.RealtimeModel` (Gemini Live)
3. Starts a `voice.AgentSession` that pipes audio between the SIP participant and Gemini
4. Transcription events (`UserInputTranscribed`, `ConversationItemAdded`) are written to the DB in real-time

```typescript
// src/agent/telephony-agent.ts
const session = new voice.AgentSession({
  llm: new google.beta.realtime.RealtimeModel({
    apiKey: geminiApiKey,
    model: geminiRealtimeModel,      // from GEMINI_REALTIME_MODEL env
    voice: geminiRealtimeVoice,      // from GEMINI_REALTIME_VOICE env
    modalities: [Modality.AUDIO],    // audio-only output (transcription via events)
    temperature: 0.4,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  }),
});
```

### Why `Modality.AUDIO` only?
Native audio models reject `AUDIO+TEXT` response modalities in the realtime setup. We use audio output and rely on the `inputAudioTranscription` / `outputAudioTranscription` settings to get text back via transcription events — not as direct text responses.

### Voice configuration
Set `GEMINI_REALTIME_VOICE` to any supported voice name. Default is `Puck`. [Available voices →](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini-live)

### Model configuration
Set `GEMINI_REALTIME_MODEL` in `.env`. Default: `gemini-2.5-flash-native-audio-preview-12-2025`.

---

## 2. Gemini generateContent (Text/JSON mode)

**Used for:** Two structured text tasks:

### 2a. Intake Parsing (`src/lib/intake/parse.ts`)

When a user submits free-form text, Gemini parses it into a structured investigation plan:

```typescript
const response = await ai.models.generateContent({
  model: geminiIntakeModel,             // GEMINI_INTAKE_MODEL env var
  contents: buildIntakeParserPrompt({ rawInput, regexPhones }),
  config: {
    responseMimeType: "application/json",
    responseSchema: intakeParserResponseSchema,  // enforces JSON shape
  },
});
```

The response schema is defined in `src/lib/calls/prompts.ts` and validated with Zod in `parse.ts`. This extracts:
- `requirement` — what to investigate
- `contacts[]` — name, phone, inferred language
- `generalQuestions` — what to ask

### 2b. Structured Extraction (`src/lib/calls/extract.ts`)

After each call ends, the transcript is passed to Gemini to extract scored findings:

```typescript
const response = await ai.models.generateContent({
  model: geminiIntakeModel,
  contents: buildExtractionPrompt(transcriptText, requirement),
  config: {
    responseMimeType: "application/json",
    responseSchema: extractionResponseSchema,
  },
});
```

Output includes: `summary`, `priceEstimate`, `availability`, `fitSummary`, `confidence` (0–1), `score` (0–100), `actionItems[]`.

---

## 3. Client Singleton

To avoid re-instantiating `GoogleGenAI` on every call, a singleton is used:

```typescript
// src/lib/gemini-client.ts
let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  const { geminiApiKey } = requireGeminiEnv();
  _client = new GoogleGenAI({ apiKey: geminiApiKey });
  return _client;
}
```

The telephony agent creates its own client per job (different process), while the Next.js app shares the singleton.

---

## 4. Environment variables

| Variable | Used by | Default |
|----------|---------|---------|
| `GEMINI_API_KEY` | All Gemini calls | — (required) |
| `GEMINI_INTAKE_MODEL` | Intake parsing + extraction | `gemini-3-pro-preview` |
| `GEMINI_REALTIME_MODEL` | Live voice agent | `gemini-2.5-flash-native-audio-preview-12-2025` |
| `GEMINI_REALTIME_VOICE` | Live voice agent | `Puck` |
