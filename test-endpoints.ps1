# Script for testing endpoints
$baseUrl = "https://telegram-scheduler-production.up.railway.app"

Write-Host "Testing endpoints..." -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 10
    Write-Host "OK: Health Check" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Date: $($health.date)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Health Check - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Test Image Generation
Write-Host "2. Testing image generation..." -ForegroundColor Yellow
try {
    $testImage = Invoke-RestMethod -Uri "$baseUrl/test-image?shift=day" -Method GET -TimeoutSec 60
    if ($testImage.status -eq "success") {
        Write-Host "OK: Image generation" -ForegroundColor Green
        $sizeKB = [math]::Round($testImage.imageSize / 1024, 2)
        Write-Host "   Image size: $($testImage.imageSize) bytes ($sizeKB KB)" -ForegroundColor Gray
        Write-Host "   HTML length: $($testImage.htmlLength) chars" -ForegroundColor Gray
        Write-Host "   Reports loaded: $($testImage.reportsCount)" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Image generation" -ForegroundColor Red
        Write-Host "   Message: $($testImage.message)" -ForegroundColor Red
        if ($testImage.stack) {
            Write-Host "   Stack: $($testImage.stack)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "ERROR: Image generation - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Manual Report Send info
Write-Host "3. Report endpoint info..." -ForegroundColor Yellow
Write-Host "   WARNING: This endpoint will send real report to Telegram!" -ForegroundColor Yellow
Write-Host "   For testing use: $baseUrl/test-image" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "   Health:   $baseUrl/health" -ForegroundColor Gray
Write-Host "   Test:     $baseUrl/test-image?shift=day" -ForegroundColor Gray
Write-Host "   Report:   $baseUrl/send-report?shift=day" -ForegroundColor Gray
Write-Host ""

