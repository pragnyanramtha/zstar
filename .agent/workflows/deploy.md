---
description: Deploy Zeppy to GCP (Cloud Run + Cloud SQL)
---

# Zeppy GCP Deployment

Replace `YOUR_PROJECT_ID` and `YOUR_DB_PASSWORD` with your real values throughout.
Region `us-central1` is used below — change if preferred (e.g. `asia-south1` for India).

---

## STEP 0 — Prerequisites

Install and authenticate:
```bash
# Install gcloud CLI if not already: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud auth configure-docker us-central1-docker.pkg.dev

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

---

## STEP 1 — Enable GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## STEP 2 — Create Artifact Registry

```bash
gcloud artifacts repositories create zeppy \
  --repository-format=docker \
  --location=us-central1 \
  --description="Zeppy container images"
```

---

## STEP 3 — Create Cloud SQL (PostgreSQL)

```bash
# Create the instance (~3 mins)
gcloud sql instances create zeppy-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10

# Create database and user
gcloud sql databases create zeppy --instance=zeppy-db
gcloud sql users create zeppy --instance=zeppy-db --password=YOUR_DB_PASSWORD

# Get connection name — save this output, you'll need it
gcloud sql instances describe zeppy-db --format='value(connectionName)'
# → YOUR_PROJECT_ID:us-central1:zeppy-db
```

---

## STEP 4 — Store Secrets in Secret Manager

Replace each value with your real credentials from `.env`:

```bash
# Database (uses Cloud SQL socket path)
echo -n "postgresql://zeppy:YOUR_DB_PASSWORD@localhost/zeppy?host=/cloudsql/YOUR_PROJECT_ID:us-central1:zeppy-db" \
  | gcloud secrets create DATABASE_URL --data-file=-

# LiveKit
echo -n "wss://your-project.livekit.cloud" | gcloud secrets create LIVEKIT_URL --data-file=-
echo -n "APIxxxxxxxxxx"                     | gcloud secrets create LIVEKIT_API_KEY --data-file=-
echo -n "your-secret"                       | gcloud secrets create LIVEKIT_API_SECRET --data-file=-
echo -n "ST_xxxxxxxxxx"                     | gcloud secrets create LIVEKIT_SIP_TRUNK_ID --data-file=-
echo -n "+14155551234"                      | gcloud secrets create LIVEKIT_SIP_NUMBER --data-file=-
echo -n "callagent-telephony-agent"         | gcloud secrets create LIVEKIT_AGENT_NAME --data-file=-

# Twilio
echo -n "ACxxxxxxxxxxxxxxxx" | gcloud secrets create TWILIO_ACCOUNT_SID --data-file=-
echo -n "your-auth-token"    | gcloud secrets create TWILIO_AUTH_TOKEN --data-file=-
echo -n "TKxxxxxxxxxxxxxxxx" | gcloud secrets create TWILIO_SIP_TRUNK_SID --data-file=-

# Gemini
echo -n "AIzaSy_xxxxxxxxxx" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

Grant Cloud Run access to secrets:
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## STEP 5 — Build & Push Docker Images

```bash
REGION=us-central1
PROJECT=YOUR_PROJECT_ID
REPO=$REGION-docker.pkg.dev/$PROJECT/zeppy

# Build Next.js app
docker build -t $REPO/zeppy-app:latest .

# Build agent worker
docker build -f Dockerfile.agent -t $REPO/zeppy-agent:latest .

# Push both
docker push $REPO/zeppy-app:latest
docker push $REPO/zeppy-agent:latest
```

---

## STEP 6 — Run Database Migrations

```bash
gcloud run jobs create zeppy-migrate \
  --image=$REPO/zeppy-app:latest \
  --command="npx" \
  --args="prisma,migrate,deploy" \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:zeppy-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --region=us-central1

# Execute it (wait for completion)
gcloud run jobs execute zeppy-migrate --region=us-central1 --wait
```

---

## STEP 7 — Deploy Next.js App

```bash
gcloud run deploy zeppy-app \
  --image=$REPO/zeppy-app:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=3600 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:zeppy-db \
  --set-secrets=\
DATABASE_URL=DATABASE_URL:latest,\
LIVEKIT_URL=LIVEKIT_URL:latest,\
LIVEKIT_API_KEY=LIVEKIT_API_KEY:latest,\
LIVEKIT_API_SECRET=LIVEKIT_API_SECRET:latest,\
LIVEKIT_SIP_TRUNK_ID=LIVEKIT_SIP_TRUNK_ID:latest,\
LIVEKIT_SIP_NUMBER=LIVEKIT_SIP_NUMBER:latest,\
TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,\
TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,\
TWILIO_SIP_TRUNK_SID=TWILIO_SIP_TRUNK_SID:latest,\
GEMINI_API_KEY=GEMINI_API_KEY:latest
```

The command will output your app URL: `https://zeppy-app-xxxx-uc.a.run.app`

---

## STEP 8 — Deploy LiveKit Agent Worker

```bash
gcloud run deploy zeppy-agent \
  --image=$REPO/zeppy-agent:latest \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --port=8080 \
  --min-instances=1 \
  --max-instances=3 \
  --timeout=3600 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:zeppy-db \
  --set-secrets=\
DATABASE_URL=DATABASE_URL:latest,\
LIVEKIT_URL=LIVEKIT_URL:latest,\
LIVEKIT_API_KEY=LIVEKIT_API_KEY:latest,\
LIVEKIT_API_SECRET=LIVEKIT_API_SECRET:latest,\
LIVEKIT_SIP_TRUNK_ID=LIVEKIT_SIP_TRUNK_ID:latest,\
LIVEKIT_SIP_NUMBER=LIVEKIT_SIP_NUMBER:latest,\
LIVEKIT_AGENT_NAME=LIVEKIT_AGENT_NAME:latest,\
TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,\
TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,\
TWILIO_SIP_TRUNK_SID=TWILIO_SIP_TRUNK_SID:latest,\
GEMINI_API_KEY=GEMINI_API_KEY:latest
```

> **Important:** `min-instances=1` keeps the agent alive so LiveKit can always dispatch calls to it.

---

## STEP 9 — Verify

```bash
# Check services are running
gcloud run services list --region=us-central1

# Tail app logs
gcloud run services logs tail zeppy-app --region=us-central1

# Tail agent logs
gcloud run services logs tail zeppy-agent --region=us-central1
```

---

## Re-deploying After Code Changes

```bash
# Rebuild and push
docker build -t $REPO/zeppy-app:latest . && docker push $REPO/zeppy-app:latest

# Deploy new revision (zero downtime)
gcloud run deploy zeppy-app --image=$REPO/zeppy-app:latest --region=us-central1
```
