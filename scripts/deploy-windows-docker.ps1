# Deploy without docker-compose (Windows Server / Portainer host)
# Usage:
#   cd C:\apps\memo-day
#   copy stack.env.example stack.env
#   notepad stack.env
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-windows-docker.ps1

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

Load-EnvFile "$Root\stack.env"

$Network = "dailysitereport-net"
$Volume = "dailysitereport_pgdata"
$DbContainer = "dailysitereport_db"
$AppContainer = "dailysitereport_app"
$Image = "dailysitereport-app:latest"
$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3000" }

Write-Host "Docker version:" -ForegroundColor Cyan
docker version

docker network create $Network 2>$null | Out-Null
docker volume create $Volume 2>$null | Out-Null

docker rm -f $AppContainer 2>$null | Out-Null
docker rm -f $DbContainer 2>$null | Out-Null

Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker run -d `
  --name $DbContainer `
  --network $Network `
  --restart unless-stopped `
  -e "POSTGRES_DB=$env:POSTGRES_DB" `
  -e "POSTGRES_USER=$env:POSTGRES_USER" `
  -e "POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD" `
  -v "${Volume}:/var/lib/postgresql/data" `
  postgres:16

Write-Host "Waiting for PostgreSQL (15s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "Building application image..." -ForegroundColor Cyan
docker build -t $Image .

$DatabaseUrl = "postgresql://$($env:POSTGRES_USER):$($env:POSTGRES_PASSWORD)@${DbContainer}:5432/$($env:POSTGRES_DB)"

Write-Host "Starting application..." -ForegroundColor Cyan
docker run -d `
  --name $AppContainer `
  --network $Network `
  --restart unless-stopped `
  -e "DATABASE_URL=$DatabaseUrl" `
  -e "SESSION_SECRET=$env:SESSION_SECRET" `
  -e "NODE_ENV=production" `
  -e "PORT=5000" `
  -e "COOKIE_SECURE=$($env:COOKIE_SECURE)" `
  -p "${AppPort}:5000" `
  $Image

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "App: http://dailysitereport.parkland.lan:$AppPort"
Write-Host "Logs: docker logs -f $AppContainer"
