# Start Parkland Dailyonsite (native Windows)
# Usage:
#   cd C:\apps\memo-day
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-windows-native.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Load-EnvFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Missing $Path - copy stack.env.example to stack.env and edit it."
    }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $i = $line.IndexOf("=")
        if ($i -lt 1) { return }
        $key = $line.Substring(0, $i).Trim()
        $val = $line.Substring($i + 1).Trim()
        Set-Item -Path "env:$key" -Value $val
    }
}

function Encode-PostgresPassword {
    param([string]$Password)
    return [uri]::EscapeDataString($Password)
}

Load-EnvFile "$Root\stack.env"

$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3000" }
$DbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$EncodedPassword = Encode-PostgresPassword $env:POSTGRES_PASSWORD

$env:DATABASE_URL = "postgresql://$($env:POSTGRES_USER):${EncodedPassword}@${DbHost}:5432/$($env:POSTGRES_DB)"
$env:NODE_ENV = "production"
$env:PORT = $AppPort
if (-not $env:COOKIE_SECURE) { $env:COOKIE_SECURE = "false" }

if (-not $env:SESSION_SECRET -or $env:SESSION_SECRET -like "change-me*") {
    throw "Set SESSION_SECRET in stack.env (min 32 random characters)."
}

if (-not (Test-Path "$Root\dist\index.cjs")) {
    throw "dist\index.cjs not found. Run deploy-windows-native.ps1 first."
}

Write-Host "Starting app on port $AppPort..." -ForegroundColor Cyan
Write-Host "http://192.168.90.213:$AppPort" -ForegroundColor Green
node dist/index.cjs
