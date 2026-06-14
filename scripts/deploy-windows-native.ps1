# Deploy without Docker — Node.js + PostgreSQL installed on Windows Server
# Usage:
#   cd C:\apps\memo-day
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-windows-native.ps1
#
# Prerequisites:
#   - Node.js 20 LTS: https://nodejs.org/
#   - PostgreSQL 16:  https://www.postgresql.org/download/windows/
#     Create DB "dailysitereport" and user matching stack.env (or use postgres superuser for db:push)

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

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js not found. Install Node 20 LTS from https://nodejs.org/ then re-run."
}

$nodeVersion = (node -v) -replace "^v", ""
Write-Host "Node.js $nodeVersion" -ForegroundColor Cyan

$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3000" }
$DbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$EncodedPassword = Encode-PostgresPassword $env:POSTGRES_PASSWORD
$DatabaseUrl = "postgresql://$($env:POSTGRES_USER):${EncodedPassword}@${DbHost}:5432/$($env:POSTGRES_DB)"

$env:DATABASE_URL = $DatabaseUrl
$env:PORT = $AppPort
# Do not set NODE_ENV=production before npm ci — it skips devDependencies (tsx, vite, drizzle-kit)
if ($env:NODE_ENV -eq "production") { Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue }
if (-not $env:SESSION_SECRET -or $env:SESSION_SECRET -like "change-me*") {
    throw "Set SESSION_SECRET in stack.env (min 32 random characters)."
}
if (-not $env:COOKIE_SECURE) { $env:COOKIE_SECURE = "false" }

Write-Host "Checking PostgreSQL on ${DbHost}:5432..." -ForegroundColor Cyan
$pgOk = Test-NetConnection -ComputerName $DbHost -Port 5432 -WarningAction SilentlyContinue
if (-not $pgOk.TcpTestSucceeded) {
    Write-Host ""
    Write-Host "PostgreSQL is not reachable on ${DbHost}:5432." -ForegroundColor Yellow
    Write-Host "Install PostgreSQL for Windows, then create the database and user:" -ForegroundColor Yellow
    Write-Host "  CREATE USER parkland WITH PASSWORD 'your-password';"
    Write-Host "  CREATE DATABASE dailysitereport OWNER parkland;"
    Write-Host ""
    throw "PostgreSQL not available."
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

Write-Host "Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

Write-Host "Applying database schema..." -ForegroundColor Cyan
npm run db:push
if ($LASTEXITCODE -ne 0) { throw "npm run db:push failed" }

Write-Host ""
Write-Host "Build complete. Start the app with:" -ForegroundColor Green
Write-Host ""
Write-Host "  `$env:DATABASE_URL='$DatabaseUrl'"
Write-Host "  `$env:SESSION_SECRET='$($env:SESSION_SECRET)'"
Write-Host "  `$env:NODE_ENV='production'"
Write-Host "  `$env:PORT='$AppPort'"
Write-Host "  `$env:COOKIE_SECURE='$($env:COOKIE_SECURE)'"
Write-Host "  node dist/index.cjs"
Write-Host ""
Write-Host "App URL: http://dailysitereport.parkland.lan:$AppPort"
Write-Host "App URL: http://192.168.90.213:$AppPort"
Write-Host ""
Write-Host "To run in background (keeps window open):" -ForegroundColor Cyan
Write-Host "  Start-Process powershell -ArgumentList '-NoExit','-Command',\"cd '$Root'; `$env:DATABASE_URL='$DatabaseUrl'; `$env:SESSION_SECRET='$($env:SESSION_SECRET)'; `$env:NODE_ENV='production'; `$env:PORT='$AppPort'; `$env:COOKIE_SECURE='$($env:COOKIE_SECURE)'; node dist/index.cjs\""
