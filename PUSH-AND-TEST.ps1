$ErrorActionPreference = "Stop"
$repoPath = "C:\Users\Ноут\V3LS3N-telegram-bot"

Push-Location $repoPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Push - NEW APPROACH (sendDocument)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Adding index.js..." -ForegroundColor Yellow
git add index.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git add failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Committing..." -ForegroundColor Yellow
git commit -m "Fix: Use sendDocument instead of sendPhoto - completely new approach"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git commit failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git push failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Wait 2-3 minutes for Railway deployment" -ForegroundColor Green
Write-Host "Then I will send test report automatically" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Pop-Location

# Wait 3 minutes for deployment
Write-Host "Waiting 180 seconds for Railway deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 180

Write-Host "Sending test report..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://telegram-scheduler-production.up.railway.app/send-report?shift=day" -Method GET -TimeoutSec 120
    Write-Host "Report sent! Check your Telegram." -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "Error sending report: $_" -ForegroundColor Red
}

