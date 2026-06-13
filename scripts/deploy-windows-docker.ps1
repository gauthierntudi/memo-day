# Deploy without docker-compose (Windows Server)
# Usage:
#   cd C:\apps\memo-day
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

function Encode-PostgresPassword {
    param([string]$Password)
    return [uri]::EscapeDataString($Password)
}

function Run-Docker {
    param([Parameter(Mandatory = $true)][string[]]$Command)
    Write-Host ("docker " + ($Command -join " ")) -ForegroundColor DarkGray
    & docker @Command
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed (exit $LASTEXITCODE): docker $($Command -join ' ')"
    }
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
Run-Docker @("version")

$OsType = (docker info --format "{{.OSType}}" 2>$null).Trim()
if ($OsType -eq "windows") {
    Write-Host ""
    Write-Host "Docker is in WINDOWS container mode. Linux images (postgres:16, node:20-alpine) cannot run." -ForegroundColor Red
    Write-Host "Use native deployment instead:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\deploy-windows-native.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or switch Docker to Linux containers (Docker Desktop only):" -ForegroundColor Yellow
    Write-Host '  & "$Env:ProgramFiles\Docker\Docker\DockerCli.exe" -SwitchDaemon' -ForegroundColor Yellow
    exit 1
}

try {
    Run-Docker @("network", "create", $Network)
} catch {
    Write-Host "Custom network unavailable - using default bridge with --link." -ForegroundColor Yellow
    $UseLink = $true
}

docker volume create $Volume 2>$null | Out-Null
docker rm -f $AppContainer 2>$null | Out-Null
docker rm -f $DbContainer 2>$null | Out-Null

Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
if ($UseLink) {
    Run-Docker @(
        "run", "-d",
        "--name", $DbContainer,
        "--restart", "unless-stopped",
        "-e", "POSTGRES_DB=$($env:POSTGRES_DB)",
        "-e", "POSTGRES_USER=$($env:POSTGRES_USER)",
        "-e", "POSTGRES_PASSWORD=$($env:POSTGRES_PASSWORD)",
        "-v", "${Volume}:/var/lib/postgresql/data",
        "postgres:16"
    )
} else {
    Run-Docker @(
        "run", "-d",
        "--name", $DbContainer,
        "--network", $Network,
        "--restart", "unless-stopped",
        "-e", "POSTGRES_DB=$($env:POSTGRES_DB)",
        "-e", "POSTGRES_USER=$($env:POSTGRES_USER)",
        "-e", "POSTGRES_PASSWORD=$($env:POSTGRES_PASSWORD)",
        "-v", "${Volume}:/var/lib/postgresql/data",
        "postgres:16"
    )
}

Write-Host "Waiting for PostgreSQL (20s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

Write-Host "Building application image (may take several minutes)..." -ForegroundColor Cyan
Run-Docker @("build", "-t", $Image, ".")

$EncodedPassword = Encode-PostgresPassword $env:POSTGRES_PASSWORD
if ($UseLink) {
    $DatabaseUrl = "postgresql://$($env:POSTGRES_USER):${EncodedPassword}@postgres:5432/$($env:POSTGRES_DB)"
} else {
    $DatabaseUrl = "postgresql://$($env:POSTGRES_USER):${EncodedPassword}@${DbContainer}:5432/$($env:POSTGRES_DB)"
}

Write-Host "Starting application..." -ForegroundColor Cyan
if ($UseLink) {
    Run-Docker @(
        "run", "-d",
        "--name", $AppContainer,
        "--link", "${DbContainer}:postgres",
        "--restart", "unless-stopped",
        "-e", "DATABASE_URL=$DatabaseUrl",
        "-e", "SESSION_SECRET=$($env:SESSION_SECRET)",
        "-e", "NODE_ENV=production",
        "-e", "PORT=5000",
        "-e", "COOKIE_SECURE=$($env:COOKIE_SECURE)",
        "-p", "${AppPort}:5000",
        $Image
    )
} else {
    Run-Docker @(
        "run", "-d",
        "--name", $AppContainer,
        "--network", $Network,
        "--restart", "unless-stopped",
        "-e", "DATABASE_URL=$DatabaseUrl",
        "-e", "SESSION_SECRET=$($env:SESSION_SECRET)",
        "-e", "NODE_ENV=production",
        "-e", "PORT=5000",
        "-e", "COOKIE_SECURE=$($env:COOKIE_SECURE)",
        "-p", "${AppPort}:5000",
        $Image
    )
}

Write-Host ""
Write-Host "Success - containers are running." -ForegroundColor Green
Run-Docker @("ps")
Write-Host ""
Write-Host "App: http://dailysitereport.parkland.lan:$AppPort"
Write-Host "App: http://192.168.90.213:$AppPort"
Write-Host "Logs: docker logs -f $AppContainer"
