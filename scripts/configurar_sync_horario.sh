#!/usr/bin/env bash
set -euo pipefail

: "${CACHE_BUCKET:?Define CACHE_BUCKET}"
: "${RUNTIME_SERVICE_ACCOUNT:?Define RUNTIME_SERVICE_ACCOUNT}"
: "${SCHEDULER_SERVICE_ACCOUNT:?Define SCHEDULER_SERVICE_ACCOUNT}"

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0695066948}"
REGION="${REGION:-southamerica-west1}"
JOB_NAME="${JOB_NAME:-meteoprecisa-sync}"
ENV_VARS="APP_ENV=production,CACHE_BACKEND=gcs,CACHE_STORAGE_BUCKET=${CACHE_BUCKET},CACHE_STORAGE_OBJECT=cache/cache_servidor.json,ENABLE_IN_PROCESS_SYNC=false"
SECRETS="USUARIO_DMC=meteoprecisa-dmc-user:latest,TOKEN_DMC=meteoprecisa-dmc-token:latest,PURPLEAIR_API_KEY=meteoprecisa-purpleair-key:latest"

gcloud services enable run.googleapis.com cloudscheduler.googleapis.com storage.googleapis.com --project "$PROJECT_ID"
gcloud storage buckets describe "gs://${CACHE_BUCKET}" --project "$PROJECT_ID" 2>/dev/null || gcloud storage buckets create "gs://${CACHE_BUCKET}" --location "$REGION" --project "$PROJECT_ID"

gcloud run jobs deploy "$JOB_NAME" --source . --region "$REGION" --project "$PROJECT_ID" \
  --service-account "$RUNTIME_SERVICE_ACCOUNT" --command python --args sync_job.py \
  --set-env-vars "$ENV_VARS" --set-secrets "$SECRETS" --max-retries 1 --task-timeout 20m

gcloud scheduler jobs delete "${JOB_NAME}-hourly" --location "$REGION" --project "$PROJECT_ID" --quiet || true
gcloud scheduler jobs create http "${JOB_NAME}-hourly" --location "$REGION" --project "$PROJECT_ID" \
  --schedule "0 * * * *" --time-zone "America/Santiago" --http-method POST \
  --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}:run" \
  --oauth-service-account-email "$SCHEDULER_SERVICE_ACCOUNT" \
  --oauth-token-scope "https://www.googleapis.com/auth/cloud-platform" --message-body "{}"
