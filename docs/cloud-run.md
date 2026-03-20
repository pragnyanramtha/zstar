# Cloud Run Deployment

This guide covers deploying Zeppy to Google Cloud Run.

> The deploy workflow is also available as `/deploy` — see `.agent/workflows/deploy.md`.

---

## Prerequisites

- `gcloud` CLI authenticated
- Cloud SQL (PostgreSQL) instance provisioned
- GCP service account with:
  - `roles/storage.objectAdmin` (for recording uploads)
  - `roles/cloudsql.client`
- Docker image pushed to Artifact Registry

---

## Environment variables on Cloud Run

Set these via `gcloud run services update` or the Cloud Console:

```bash
gcloud run services update zeppy \
  --set-env-vars DATABASE_URL=... \
  --set-env-vars GEMINI_API_KEY=... \
  --set-env-vars LIVEKIT_URL=... \
  --set-env-vars LIVEKIT_API_KEY=... \
  --set-env-vars LIVEKIT_API_SECRET=... \
  --set-env-vars LIVEKIT_SIP_TRUNK_ID=... \
  --set-env-vars TWILIO_ACCOUNT_SID=... \
  --set-env-vars TWILIO_AUTH_TOKEN=... \
  --set-env-vars TWILIO_SIP_TRUNK_SID=... \
  --set-env-vars RECORDING_PROVIDER=gcp \
  --set-env-vars RECORDING_GCP_BUCKET=my-bucket
```

Use **Secret Manager** for sensitive keys:
```bash
gcloud run services update zeppy \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-secrets RECORDING_GCP_CREDENTIALS_B64=gcp-creds-b64:latest
```

---

## Health check

Cloud Run sends `GET /api/health` every 10 seconds. The endpoint returns `200 { status: "ok" }` in < 1ms with no DB calls. Configure it in Cloud Run:

```
Health check path: /api/health
Initial delay: 10s
Period: 10s
Timeout: 5s
```

---

## Stateless container notes

Cloud Run instances are stateless. Watch out for:

| What | Current behavior | Production recommendation |
|------|-----------------|--------------------------|
| Recording metadata | Written to `.callagent-recordings/` on local disk | Migrate to DB column |
| Rate limiter | In-process token bucket | Replace with Upstash Redis |
| Agent worker | Runs separately (`npm run dev:agent`) | Deploy as separate Cloud Run Job or always-on service |

---

## Dockerfile

The project includes `Dockerfile` (Next.js app) and `Dockerfile.agent` (LiveKit agent worker). The agent must be deployed and reachable for calls to work.

---

## Database migrations on deploy

Run migrations before traffic shifts:

```bash
# One-off Cloud Run job to migrate
gcloud run jobs create migrate \
  --image gcr.io/my-project/zeppy \
  --command "npx" \
  --args "prisma,migrate,deploy" \
  --set-env-vars DATABASE_URL=...
gcloud run jobs execute migrate --wait
```
