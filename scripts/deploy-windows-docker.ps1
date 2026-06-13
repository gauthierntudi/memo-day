# Deploy without docker-compose (Windows Server / Portainer host)
# Usage:
#   cd C:\apps\memo-day
#   copy stack.env.example stack.env
#   notepad stack.env
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-windows-docker.ps1

$ErrorActionPreference = "Continue"
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

function Invoke-Docker {
    param([string[]]$Args)
    & docker @Args 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
}

Load-EnvFile "$Root\stack.env"

$Network = "dailysitereport-net"
$Volume = "dailysitereport_pgdata"
$DbContainer = "dailysitereport_db"
$AppContainer = "dailysitereport_app"
$Image = "dailysitereport-app:latest"
$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3000" }
$UseLink = $false

Write-Host "Docker version:" -ForegroundColor Cyan
Invoke-Docker @("version") | Out-Null

# Try custom network; fallback to default bridge + --link if bridge plugin is missing
$code = Invoke-Docker @("network", "create", $Network)
if ($code -ne 0) {
    Write-Host "Bridge network plugin unavailable - using default bridge with --link." -ForegroundColor Yellow
    $UseLink = $true
}

Invoke-Docker @("volume", "create", $Volume) | Out-Null
Invoke-Docker @("rm", "-f", $AppContainer) | Out-Null
Invoke-Docker @("rm", "-f", $DbContainer) | Out-Null

Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
if ($UseLink) {
    $code = Invoke-Docker @(
        "run", "-d",
        "--name", $DbContainer,
        "--restart", "unless-stopped",
        "-e", "POSTGRES_DB=$env:POSTGRES_DB",
        "-e", "POSTGRES_USER=$env:POSTGRES_USER",
        "-e", "POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD",
        "-v", "${Volume}:/var/lib/postgresql/data",
        "postgres:16"
    )
} else {
    $code = Invoke-Docker @(
        "run", "-d",
        "--name", $DbContainer,
        "--network", $Network,
        "--restart", "unless-stopped",
        "-e", "POSTGRES_DB=$env:POSTGRES_DB",
        "-e", "POSTGRES_USER=$env:POSTGRES_USER",
        "-e", "POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD",
        "-v", "${Volume}:/var/lib/postgresql/data",
        "postgres:16"
    )
}
if ($code -ne 0) { throw "Failed to start PostgreSQL container." }

Write-Host "Waiting for PostgreSQL (20s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

Write-Host "Building application image (may take several minutes)..." -ForegroundColor Cyan
$code = Invoke-Docker @("build", "-t", $Image, ".")
if ($code -ne 0) { throw "Docker build failed." }

if ($UseLink) {
    $DatabaseUrl = "postgresql://$($env:POSTGRES_USER):$($env:POSTGRES_PASSWORD)@postgres:5432/$($env:POSTGRES_DB)"
} else {
    $DatabaseUrl = "postgresql://$($env:POSTGRES_USER):$($env:POSTGRES_PASSWORD)@${DbContainer}:5432/$($env:POSTGRES_DB)"
}

Write-Host "Starting application..." -ForegroundColor Cyan
if ($UseLink) {
    $code = Invoke-Docker @(
        "run", "-d",
        "--name", $AppContainer,
        "--link", "${DbContainer}:postgres",
        "--restart", "unless-stopped",
        "-e", "DATABASE_URL=$DatabaseUrl",
        "-e", "SESSION_SECRET=$env:SESSION_SECRET",
        "-e", "NODE_ENV=production",
        "-e", "PORT=5000",
        "-e", "COOKIE_SECURE=$($env:COOKIE_SECURE)",
        "-p", "0.0.0.0:${AppPort}:5000",
        $Image
    )
} else {
    $code = Invoke-Docker @(
        "run", "-d",
        "--name", $AppContainer,
        "--network", $Network,
        "--restart", "unless-stopped",
        "-e", "DATABASE_URL=$DatabaseUrl",
        "-e", "SESSION_SECRET=$env:SESSION_SECRET",
        "-e", "NODE_ENV=production",
        "-e", "PORT=5000",
        "-e", "COOKIE_SECURE=$($env:COOKIE_SECURE)",
        "-p", "0.0.0.0:${AppPort}:5000",
        $Image
    )
}
if ($code -ne 0) { throw "Failed to start application container." }

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "App: http://dailysitereport.parkland.lan:$AppPort"
Write-Host "App: http://192.168.90.213:$AppPort"
Write-Host "Check: docker ps"
Write-Host "Logs:  docker logs -f $AppContainer"
