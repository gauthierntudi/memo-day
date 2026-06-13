# Deploy Parkland Dailyonsite on Windows Server (without Portainer Git clone)
# Run in PowerShell on the server (192.168.90.213):
#   cd C:\apps\memo-day
#   .\scripts\deploy-windows.ps1

$ErrorActionPreference = "Stop"
$AppDir = "C:\apps\memo-day"
$RepoUrl = "https://github.com/gauthierntudi/memo-day.git"

if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path (Split-Path $AppDir) -Force | Out-Null
    git clone $RepoUrl $AppDir
} else {
    Set-Location $AppDir
    git pull origin main
}

Set-Location $AppDir

if (-not (Test-Path "stack.env")) {
    Copy-Item "stack.env.example" "stack.env"
    Write-Host ""
    Write-Host ">>> Edit stack.env (passwords + SESSION_SECRET), then re-run this script." -ForegroundColor Yellow
    notepad stack.env
    exit 1
}

# Docker Compose lit automatiquement .env (compatible toutes versions)
Copy-Item -Force stack.env .env

# docker compose (v2) ou docker-compose (v1)
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose up -d --build
} else {
    docker compose up -d --build
}

Write-Host ""
Write-Host "Done. App: http://dailysitereport.parkland.lan:3000" -ForegroundColor Green
Write-Host "Logs: docker logs -f dailysitereport_app"
