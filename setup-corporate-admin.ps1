# Corporate Admin Setup Script for Windows PowerShell

Write-Host "🚀 MANAS360 Corporate Admin Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerCmd) {
    Write-Host "❌ Docker not found. Please install Docker." -ForegroundColor Red
    Write-Host "📖 Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}

try {
    docker info *> $null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon not running." -ForegroundColor Red
    Write-Host "💡 Please start Docker Desktop and try again." -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# Start services
Write-Host "Starting database and services..." -ForegroundColor Yellow
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir
docker compose up -d

Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
Set-Location backend
npm run prisma:migrate:deploy 2>$null

# Create corporate admin
Write-Host ""
Write-Host "Creating Corporate Admin account..." -ForegroundColor Yellow
node create-corp-admin-phone.js

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Use these credentials to login:" -ForegroundColor Cyan
Write-Host "   Phone: +919000000001" -ForegroundColor White
Write-Host "   Role: Corporate Admin" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Open: http://localhost:5173/auth/login" -ForegroundColor Cyan
