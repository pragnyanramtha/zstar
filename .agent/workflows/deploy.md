---
description: Deploy Zstar to GCP (Cloud Run + Cloud SQL)
---

# Zstar GCP Deployment

Project: `gen-lang-client-0048365458` | Region: `us-central1`
Replace `YOUR_DB_PASSWORD` with the password you choose for the DB user.

**✅ Already done:** APIs enabled, Artifact Registry (`zstar`) created, Cloud SQL (`zstar-db`) provisioning.

---

## STEP 0 — Authenticate Docker to Artifact Registry

Run in **Google Cloud SDK Shell**:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## STEP 1 — Finish Cloud SQL Setup

```bash
# Create database and user inside the instance
gcloud sql databases create zstar --instance=zstar-db --project=gen-lang-client-0048365458
gcloud sql users create zstar --instance=zstar-db --password=YOUR_DB_PASSWORD --project=gen-lang-client-0048365458
```

---

## STEP 2 — Store Secrets in Secret Manager

Run each line with your real values from `.env`:

```bash
# Database — uses Cloud SQL Unix socket path (no VPC needed)
echo -n "postgresql://zstar:YOUR_DB_PASSWORD@localhost/zstar?host=/cloudsql/gen-lang-client-0048365458:us-central1:zstar-db" \
  | gcloud secrets create DATABASE_URL --data-file=- --project=gen-lang-client-0048365458

# LiveKit
echo -n "YOUR_LIVEKIT_URL"         | gcloud secrets create LIVEKIT_URL --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_LIVEKIT_API_KEY"     | gcloud secrets create LIVEKIT_API_KEY --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_LIVEKIT_API_SECRET"  | gcloud secrets create LIVEKIT_API_SECRET --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_LIVEKIT_TRUNK_ID"    | gcloud secrets create LIVEKIT_SIP_TRUNK_ID --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_LIVEKIT_SIP_NUMBER"  | gcloud secrets create LIVEKIT_SIP_NUMBER --data-file=- --project=gen-lang-client-0048365458
echo -n "callagent-telephony-agent" | gcloud secrets create LIVEKIT_AGENT_NAME --data-file=- --project=gen-lang-client-0048365458

# Twilio
echo -n "YOUR_TWILIO_ACCOUNT_SID"  | gcloud secrets create TWILIO_ACCOUNT_SID --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_TWILIO_AUTH_TOKEN"   | gcloud secrets create TWILIO_AUTH_TOKEN --data-file=- --project=gen-lang-client-0048365458
echo -n "YOUR_TWILIO_TRUNK_SID"    | gcloud secrets create TWILIO_SIP_TRUNK_SID --data-file=- --project=gen-lang-client-0048365458

# Gemini
echo -n "YOUR_GEMINI_API_KEY"      | gcloud secrets create GEMINI_API_KEY --data-file=- --project=gen-lang-client-0048365458
```

Grant Cloud Run service account access:
```bash
PROJECT_NUMBER=$(gcloud projects describe gen-lang-client-0048365458 --format='value(projectNumber)')

gcloud projects add-iam-policy-binding gen-lang-client-0048365458 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding gen-lang-client-0048365458 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## STEP 3 — Build & Push Docker Images

From the project root (`c:\Users\Pragnyan\dev\zeppy`):
```bash
REPO=us-central1-docker.pkg.dev/gen-lang-client-0048365458/zstar

# Next.js app
docker build -t $REPO/zstar-app:latest .
docker push $REPO/zstar-app:latest

# LiveKit agent worker
docker build -f Dockerfile.agent -t $REPO/zstar-agent:latest .
docker push $REPO/zstar-agent:latest
```

---

## STEP 4 — Run Database Migrations

```bash
REPO=us-central1-docker.pkg.dev/gen-lang-client-0048365458/zstar

gcloud run jobs create zstar-migrate \
  --image=$REPO/zstar-app:latest \
  --command="npx" \
  --args="prisma,migrate,deploy" \
  --add-cloudsql-instances=gen-lang-client-0048365458:us-central1:zstar-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --region=us-central1 \
  --project=gen-lang-client-0048365458

gcloud run jobs execute zstar-migrate --region=us-central1 --wait --project=gen-lang-client-0048365458
```

---

## STEP 5 — Deploy Next.js App

```bash
REPO=us-central1-docker.pkg.dev/gen-lang-client-0048365458/zstar

gcloud run deploy zstar-app \
  --image=$REPO/zstar-app:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=3600 \
  --add-cloudsql-instances=gen-lang-client-0048365458:us-central1:zstar-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,LIVEKIT_URL=LIVEKIT_URL:latest,LIVEKIT_API_KEY=LIVEKIT_API_KEY:latest,LIVEKIT_API_SECRET=LIVEKIT_API_SECRET:latest,LIVEKIT_SIP_TRUNK_ID=LIVEKIT_SIP_TRUNK_ID:latest,LIVEKIT_SIP_NUMBER=LIVEKIT_SIP_NUMBER:latest,TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,TWILIO_SIP_TRUNK_SID=TWILIO_SIP_TRUNK_SID:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --project=gen-lang-client-0048365458
```

---

## STEP 6 — Deploy LiveKit Agent

```bash
REPO=us-central1-docker.pkg.dev/gen-lang-client-0048365458/zstar

gcloud run deploy zstar-agent \
  --image=$REPO/zstar-agent:latest \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --port=8080 \
  --min-instances=1 \
  --max-instances=3 \
  --timeout=3600 \
  --add-cloudsql-instances=gen-lang-client-0048365468:us-central1:zstar-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,LIVEKIT_URL=LIVEKIT_URL:latest,LIVEKIT_API_KEY=LIVEKIT_API_KEY:latest,LIVEKIT_API_SECRET=LIVEKIT_API_SECRET:latest,LIVEKIT_SIP_TRUNK_ID=LIVEKIT_SIP_TRUNK_ID:latest,LIVEKIT_SIP_NUMBER=LIVEKIT_SIP_NUMBER:latest,LIVEKIT_AGENT_NAME=LIVEKIT_AGENT_NAME:latest,TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,TWILIO_SIP_TRUNK_SID=TWILIO_SIP_TRUNK_SID:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --project=gen-lang-client-0048365458
```

---

## STEP 7 — Verify

```bash
gcloud run services list --region=us-central1 --project=gen-lang-client-0048365458
gcloud run services logs tail zstar-app --region=us-central1 --project=gen-lang-client-0048365458
```

---

## Re-deploy After Code Changes

```bash
REPO=us-central1-docker.pkg.dev/gen-lang-client-0048365458/zstar
docker build -t $REPO/zstar-app:latest . && docker push $REPO/zstar-app:latest
gcloud run deploy zstar-app --image=$REPO/zstar-app:latest --region=us-central1 --project=gen-lang-client-0048365458
```
