# Z-star

**AI-powered phone investigation assistant** — calls contacts, investigates your requirement in real-time, streams live transcripts, and delivers ranked recommendations with action items.

Built on **Google Gemini Live API** + **LiveKit SIP** + **Next.js**, deployable to **Google Cloud Run**.

---

## How it works

```
You type a requirement + contacts
         ↓
Gemini parses your input (intake model)
         ↓
Zeppy calls each contact via LiveKit SIP + Twilio
         ↓
Gemini Live API handles the real-time voice conversation
         ↓
Transcripts stream live to your browser over SSE
         ↓
Gemini extracts structured findings from each call
         ↓
Ranked recommendations + action items delivered
```

---

## Gemini Services Used

### 1. Gemini Live API (Real-time Voice)
The outbound phone calls are powered by Gemini's native-audio realtime model via the LiveKit Agents SDK. The agent speaks naturally in the contact's language (English, Hindi, Kannada, Tamil) and listens for responses — no text-to-speech middleware required.

```
GEMINI_REALTIME_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_REALTIME_VOICE=Puck
```

→ Full details: [`docs/gemini-integration.md`](docs/gemini-integration.md)

### 2. Gemini generateContent (JSON mode)
Used for two structured tasks:
- **Intake parsing** — converts free-form user input into a structured investigation plan
- **Call extraction** — scores each call transcript and extracts summary, price, availability, confidence

```
GEMINI_INTAKE_MODEL=gemini-2.0-flash
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (Node.js runtime), SSE |
| Voice AI | Gemini Live API via LiveKit Agents SDK |
| Telephony | LiveKit SIP + Twilio SIP Trunk |
| Database | PostgreSQL + Prisma ORM |
| Infrastructure | Google Cloud Run + Cloud SQL + GCS (recordings) |

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Database
DATABASE_URL=postgresql://...

# LiveKit
LIVEKIT_URL=wss://your-livekit-cloud.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_SIP_TRUNK_ID=...
LIVEKIT_AGENT_NAME=zeppy-telephony-agent

# Twilio (for SIP trunk)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SIP_TRUNK_SID=...

# Gemini
GEMINI_API_KEY=...
GEMINI_INTAKE_MODEL=gemini-2.0-flash
GEMINI_REALTIME_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_REALTIME_VOICE=Puck

# Call settings
CALL_SESSION_TIMEOUT_SECONDS=120

# GCP recordings (optional)
RECORDING_PROVIDER=gcp
RECORDING_GCP_BUCKET=my-recordings-bucket
RECORDING_GCP_CREDENTIALS_B64=<base64 of service-account.json>
```

### 3. Start database
```bash
npm run db:up
npm run db:migrate
npm run db:generate
```

### 4. Run
```bash
npm run dev:all       # Next.js app + LiveKit agent worker
```

Open `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | App + agent worker (recommended for local dev) |
| `npm run dev:app` | Next.js only |
| `npm run dev:agent` | LiveKit agent worker only |
| `npm run test` | Run test suite (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run db:up` | Start local Postgres via Docker |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/investigations` | Create investigation (rate-limited: 30/min) |
| `POST` | `/api/intake/parse` | Preview parsed input before submitting |
| `POST` | `/api/investigations/:id/start` | Start calls |
| `GET` | `/api/investigations/:id/events` | SSE live stream |
| `GET` | `/api/investigations/:id/results` | Final ranked results |
| `GET` | `/api/recordings/:callId` | Audio recording stream |
| `GET` | `/api/health` | Cloud Run liveness probe |

---

## Security

- **Security headers** on all routes: CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy
- **Rate limiting** on investigation creation: 30 requests/min per IP
- **Zod validation** on all API inputs
- **Env validation** at startup — missing keys throw immediately
- **SIP transport security**: TLS + SRTP enforced between LiveKit and Twilio

---

## Testing

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
```

Tests live in `src/**/` colocated with source files. Pre-commit hook runs tests automatically on every commit.

---

## Deployment

→ See [`docs/cloud-run.md`](docs/cloud-run.md) for Cloud Run deployment.  
→ See [`docs/architecture.md`](docs/architecture.md) for system architecture.  
→ See [`docs/gemini-integration.md`](docs/gemini-integration.md) for Gemini API details.

---

## Notes

- Max 3 concurrent calls per investigation (configurable with `pLimit`)
- Exponential backoff retry on transient call/network failures
- Secure trunking (TLS + SRTP) required between Twilio and LiveKit
- Recording via LiveKit Egress → GCP Cloud Storage (MP3)
- The LiveKit agent worker must be running for calls to connect
