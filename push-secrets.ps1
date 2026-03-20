# push-secrets.ps1
# Reads your .env and pushes all values to GCP Secret Manager.
# Compatible with Windows PowerShell 5+

$PROJECT = "gen-lang-client-0048365458"
$GCLOUD = "C:\Users\Pragnyan\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Load .env
$envFile = Join-Path $PSScriptRoot ".env"
$envVars = @{}
foreach ($line in Get-Content $envFile -Encoding UTF8) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $parts = $line -split '=', 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    $envVars[$key] = $value
}

function Push-Secret {
    param([string]$name, [string]$value)
    if (-not $value) { Write-Warning "Skipping $name - value is empty"; return }
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $value, [System.Text.Encoding]::UTF8)
    $null = & $GCLOUD secrets describe $name --project=$PROJECT 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Updating: $name"
        & $GCLOUD secrets versions add $name --data-file=$tmp --project=$PROJECT | Out-Null
    } else {
        Write-Host "Creating: $name"
        & $GCLOUD secrets create $name --data-file=$tmp --project=$PROJECT | Out-Null
    }
    Remove-Item $tmp
}

# Database (Neon URL from .env)
Push-Secret "DATABASE_URL"         $envVars["DATABASE_URL"]

# LiveKit
Push-Secret "LIVEKIT_URL"          $envVars["LIVEKIT_URL"]
Push-Secret "LIVEKIT_API_KEY"      $envVars["LIVEKIT_API_KEY"]
Push-Secret "LIVEKIT_API_SECRET"   $envVars["LIVEKIT_API_SECRET"]
Push-Secret "LIVEKIT_SIP_TRUNK_ID" $envVars["LIVEKIT_SIP_TRUNK_ID"]
Push-Secret "LIVEKIT_SIP_NUMBER"   $envVars["LIVEKIT_SIP_NUMBER"]

$agentName = $envVars["LIVEKIT_AGENT_NAME"]
if (-not $agentName) { $agentName = "callagent-telephony-agent" }
Push-Secret "LIVEKIT_AGENT_NAME"   $agentName

# Twilio
Push-Secret "TWILIO_ACCOUNT_SID"   $envVars["TWILIO_ACCOUNT_SID"]
Push-Secret "TWILIO_AUTH_TOKEN"    $envVars["TWILIO_AUTH_TOKEN"]
Push-Secret "TWILIO_SIP_TRUNK_SID" $envVars["TWILIO_SIP_TRUNK_SID"]

# Gemini
Push-Secret "GEMINI_API_KEY"       $envVars["GEMINI_API_KEY"]

Write-Host ""
Write-Host "Done! All secrets pushed to Secret Manager." -ForegroundColor Green
