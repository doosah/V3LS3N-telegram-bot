# Script for sending test report
param(
    [string]$Shift = "day"
)

$baseUrl = "https://telegram-scheduler-production.up.railway.app"

Write-Host "Sending test report..." -ForegroundColor Cyan
Write-Host "   Shift: $Shift" -ForegroundColor Gray
Write-Host ""

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/send-report?shift=$Shift" -Method GET -TimeoutSec 120
    
    if ($result.status -eq "success") {
        Write-Host "OK: Report sent successfully!" -ForegroundColor Green
        Write-Host "   Message: $($result.message)" -ForegroundColor Gray
        Write-Host "   Date: $($result.date)" -ForegroundColor Gray
        Write-Host "   Shift: $($result.shift)" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Report sending failed" -ForegroundColor Red
        Write-Host "   Message: $($result.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Server response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

