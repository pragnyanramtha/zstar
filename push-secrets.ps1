# push-secrets.ps1
# Run this from the project root after filling in DB_PASSWORD below.
# It reads your .env and pushes all secrets to Google Secret Manager.

$PROJECT = "gen-lang-client-0048365458"
$GCLOUD = "C:\Users\Pragnyan\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$DB_PASSWORD = "REPLACE_ME_WITH_YOUR_DB_PASSWORD"  # ← put your chosen password here

# --- Load .env ----------------------------------------------------------------
$envFile = Join-Path $PSScriptRoot ".env"
$envVars = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $parts = $line -split '=', 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    $envVars[$key] = $value
}

function Push-Secret($name, $value) {
    if (-not $value) { Write-Warning "Skipping $name — value is empty"; return }
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $value, [System.Text.Encoding]::UTF8)
    $exists = & $GCLOUD secrets describe $name --project=$PROJECT 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Updating secret: $name"
        & $GCLOUD secrets versions add $name --data-file=$tmp --project=$PROJECT
    } else {
        Write-Host "Creating secret: $name"
        & $GCLOUD secrets create $name --data-file=$tmp --project=$PROJECT
    }
    Remove-Item $tmp
}

# Build DATABASE_URL using the Cloud SQL socket path
$DB_URL = "postgresql://zstar:${DB_PASSWORD}@localhost/zstar?host=/cloudsql/gen-lang-client-0048365458:us-central1:zstar-db"
Push-Secret "DATABASE_URL"          $DB_URL

# LiveKit
Push-Secret "LIVEKIT_URL"           $envVars["LIVEKIT_URL"]
Push-Secret "LIVEKIT_API_KEY"       $envVars["LIVEKIT_API_KEY"]
Push-Secret "LIVEKIT_API_SECRET"    $envVars["LIVEKIT_API_SECRET"]
Push-Secret "LIVEKIT_SIP_TRUNK_ID"  $envVars["LIVEKIT_SIP_TRUNK_ID"]
Push-Secret "LIVEKIT_SIP_NUMBER"    $envVars["LIVEKIT_SIP_NUMBER"]
Push-Secret "LIVEKIT_AGENT_NAME"    ($envVars["LIVEKIT_AGENT_NAME"] ?? "callagent-telephony-agent")

# Twilio
Push-Secret "TWILIO_ACCOUNT_SID"    $envVars["TWILIO_ACCOUNT_SID"]
Push-Secret "TWILIO_AUTH_TOKEN"     $envVars["TWILIO_AUTH_TOKEN"]
Push-Secret "TWILIO_SIP_TRUNK_SID"  $envVars["TWILIO_SIP_TRUNK_SID"]

# Gemini
Push-Secret "GEMINI_API_KEY"        $envVars["GEMINI_API_KEY"]

Write-Host "`n✅ All secrets pushed to Secret Manager." -ForegroundColor Green
