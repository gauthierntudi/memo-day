# Deploy Parkland Dailyonsite on Windows Server
# Usage:
#   cd C:\apps\memo-day
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-windows.ps1

$ErrorActionPreference = "Stop"
$AppDir = "C:\apps\memo-day"
$RepoUrl = "https://github.com/gauthierntudi/memo-day.git"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path (Split-Path $AppDir) -Force | Out-Null
    git clone $RepoUrl $AppDir
}

Set-Location $AppDir
git pull origin main

if (-not (Test-Path "stack.env")) {
    Copy-Item "stack.env.example" "stack.env"
    Write-Host ""
    Write-Host ">>> Edit stack.env (passwords + SESSION_SECRET), then re-run this script." -ForegroundColor Yellow
    notepad stack.env
    exit 1
}

# This server has no docker-compose plugin - use plain docker commands
& "$ScriptDir\deploy-windows-docker.ps1"
