# Test Telegram report sending
$baseUrl = "https://telegram-scheduler-production.up.railway.app"

Write-Host "Testing Telegram report sending..." -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "[1/2] Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -TimeoutSec 10
    Write-Host "OK: Health Check" -ForegroundColor Green
    Write-Host "   Status: $($health.status)"
    Write-Host "   Date: $($health.date)"
} catch {
    Write-Host "ERROR: Health Check - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Send report
Write-Host "[2/2] Sending report to Telegram..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/send-report?shift=day" -Method GET -TimeoutSec 120
    
    if ($result.status -eq "success") {
        Write-Host "SUCCESS: Report sent!" -ForegroundColor Green
        Write-Host "   Message: $($result.message)"
        Write-Host "   Date: $($result.date)"
        Write-Host "   Shift: $($result.shift)"
    } else {
        Write-Host "ERROR: Report sending failed" -ForegroundColor Red
        Write-Host "   Message: $($result.message)"
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Server response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Check your Telegram chat for the report image!" -ForegroundColor Cyan

