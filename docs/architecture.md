# Zeppy — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                     │
│  Form → SSE stream → Live transcript → Results page          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / SSE
┌───────────────────────────▼─────────────────────────────────┐
│              Next.js API Routes (Cloud Run)                   │
│                                                              │
│  POST /api/investigations   → create investigation           │
│  POST /api/investigations/:id/start → kick off orchestrator  │
│  GET  /api/investigations/:id/events → SSE live stream       │
│  GET  /api/investigations/:id/results → final rankings       │
│  GET  /api/health           → Cloud Run liveness probe       │
└──────────┬────────────────────────────────────┬─────────────┘
           │                                    │
┌──────────▼──────────┐              ┌──────────▼──────────────┐
│   Orchestrator       │              │  Gemini API              │
│   (p-limit, 3 max    │              │                          │
│    concurrent)       │              │  • Intake parser         │
│                      │              │  • Structured extraction │
│  retry + backoff     │              │  • gemini-intake-model   │
└──────────┬──────────┘              └─────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│   LiveKit                                                     │
│                                                              │
│   AgentDispatch → Voice Agent Worker (telephony-agent.ts)    │
│   SIP → Twilio trunk → Outbound phone call                   │
│                                                              │
│   Gemini Realtime (gemini-live-2.5-flash)                    │
│   Audio → Live transcription → appendTranscript → SSE        │
│                                                              │
│   Egress → GCP Cloud Storage (MP3 recording)                 │
└──────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────┐
│   PostgreSQL (Prisma) │
│   Investigation       │
│   Call                │
│   Contact             │
│   TranscriptEvent     │
│   ExtractedFinding    │
│   Recommendation      │
│   ActionItem          │
│   EventLog            │
└───────────────────────┘
```

## Key Design Decisions

### Why SSE (not WebSockets)?
SSE is unidirectional (server → client), which is all we need for live updates. It works seamlessly with Next.js API routes, Cloud Run, and HTTP/2 without special infrastructure.

### Why Gemini Live API for voice?
Gemini's Realtime native-audio model gives us low-latency, natural-language voice that understands and responds in multiple Indian languages (Tamil, Hindi, Kannada, etc.) without transcription-then-generate roundtrips.

### Why LiveKit for telephony?
LiveKit abstracts SIP trunk management, audio routing, and egress recording. The agent worker (LiveKit Agents SDK) connects to the same room as the SIP participant, enabling real-time audio without managing raw SIP or RTP.

### Why Prisma + PostgreSQL?
Strong typing via generated client, migration history, and transaction support for the atomic recommendation/action-item write at investigation completion.

### Cloud Run considerations
- Each deployment is a stateless container — no local file system persistence
- Recording metadata is stored in `.callagent-recordings/` (gitignored) — fine for single-instance, should move to DB for multi-instance
- In-process rate limiter is sufficient for single-instance; upgrade to Redis/Upstash for HA
- `GET /api/health` required for liveness probe

## Data Flow per Call

```
1. POST /api/investigations → create Investigation + Calls in DB
2. POST /api/investigations/:id/start
   ├─ Update status = RUNNING
   └─ void runInvestigation() [background, no await]

3. runInvestigation (orchestrator)
   ├─ p-limit(3) concurrent call jobs
   └─ per-call:
      ├─ dispatchVoiceAgent → LiveKit AgentDispatch
      ├─ dialContactViaLiveKit → SIP participant
      ├─ waitForSipParticipantExit (poll every 1.5s)
      ├─ finalizeLiveKitRoomRecording → GCP upload
      ├─ waitForConversationTranscript (poll DB up to 12s)
      ├─ extractStructuredFinding → Gemini (JSON mode)
      └─ saveExtractedFinding + updateCallStatus

4. After all calls:
   ├─ buildRecommendations (score ranking)
   ├─ buildRecommendationSummary
   ├─ buildActionItems
   └─ createMany(recommendations + actionItems) in single TX

5. Investigation status = COMPLETED
   └─ SSE clients receive investigation.completed event
```
