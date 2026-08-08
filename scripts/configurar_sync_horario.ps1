param(
  [Parameter(Mandatory = $true)] [string] $CacheBucket,
  [Parameter(Mandatory = $true)] [string] $RuntimeServiceAccount,
  [Parameter(Mandatory = $true)] [string] $SchedulerServiceAccount,
  [string] $ProjectId = "gen-lang-client-0695066948",
  [string] $Region = "southamerica-west1",
  [string] $JobName = "meteoprecisa-sync"
)

$ErrorActionPreference = "Stop"
$envVars = "APP_ENV=production,CACHE_BACKEND=gcs,CACHE_STORAGE_BUCKET=$CacheBucket,CACHE_STORAGE_OBJECT=cache/cache_servidor.json,ENABLE_IN_PROCESS_SYNC=false"
$secrets = "USUARIO_DMC=meteoprecisa-dmc-user:latest,TOKEN_DMC=meteoprecisa-dmc-token:latest,PURPLEAIR_API_KEY=meteoprecisa-purpleair-key:latest"

gcloud services enable run.googleapis.com cloudscheduler.googleapis.com storage.googleapis.com --project $ProjectId

if (-not (gcloud storage buckets describe "gs://$CacheBucket" --project $ProjectId 2>$null)) {
  gcloud storage buckets create "gs://$CacheBucket" --location $Region --project $ProjectId
}

gcloud run jobs deploy $JobName `
  --source . `
  --region $Region `
  --project $ProjectId `
  --service-account $RuntimeServiceAccount `
  --command python `
  --args sync_job.py `
  --set-env-vars $envVars `
  --set-secrets $secrets `
  --max-retries 1 `
  --task-timeout 20m

$jobUri = "https://run.googleapis.com/v2/projects/$ProjectId/locations/$Region/jobs/${JobName}:run"
gcloud scheduler jobs delete "${JobName}-hourly" --location $Region --project $ProjectId --quiet 2>$null
gcloud scheduler jobs create http "${JobName}-hourly" `
  --location $Region `
  --project $ProjectId `
  --schedule "0 * * * *" `
  --time-zone "America/Santiago" `
  --http-method POST `
  --uri $jobUri `
  --oauth-service-account-email $SchedulerServiceAccount `
  --oauth-token-scope "https://www.googleapis.com/auth/cloud-platform" `
  --message-body "{}"

Write-Host "Sincronización horaria configurada. Verifica que el runtime tenga Storage Object Admin/Secret Accessor y el scheduler permisos para ejecutar jobs." -ForegroundColor Green
