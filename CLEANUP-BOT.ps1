# PowerShell script to clean up V3LS3N-telegram-bot unnecessary files
$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TELEGRAM BOT CLEANUP ANALYSIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Essential files for telegram bot
$keepFiles = @(
    "index.js",
    "table-generator.js",
    "package.json",
    "package-lock.json",
    "README.md",
    "render.yaml"
)

Write-Host "ESSENTIAL FILES:" -ForegroundColor Green
$keepFiles | ForEach-Object { Write-Host "  OK: $_" -ForegroundColor White }
Write-Host ""

# Test files can be kept (useful for testing)
$testFiles = @(
    "test-send-image.js",
    "test-send-specific-date.js",
    "test-reminder-and-report.js",
    "test-endpoints.ps1",
    "send-test-report.ps1"
)

Write-Host "TEST FILES (kept for testing):" -ForegroundColor Cyan
$testFiles | ForEach-Object { Write-Host "  OK: $_" -ForegroundColor Gray }
Write-Host ""

# Files to remove
$filesToRemove = @()
$filesToRemove += Get-ChildItem -Path . -Filter "*.bat" -File -ErrorAction SilentlyContinue
$filesToRemove += Get-ChildItem -Path . -Filter "*.md" -File | Where-Object { $_.Name -ne "README.md" }
$filesToRemove += Get-ChildItem -Path . -Filter "auto-push.js" -File -ErrorAction SilentlyContinue
$filesToRemove += Get-ChildItem -Path . -Filter "check-what-is-pushed.js" -File -ErrorAction SilentlyContinue
$filesToRemove += Get-ChildItem -Path . -Filter "clear-and-fill-reports.js" -File -ErrorAction SilentlyContinue

# Filter out keep files
$filesToRemove = $filesToRemove | Where-Object {
    $name = $_.Name
    $name -notin $keepFiles -and $name -notin $testFiles
} | Select-Object -Unique

if ($filesToRemove.Count -gt 0) {
    Write-Host "FILES TO REMOVE:" -ForegroundColor Yellow
    $filesToRemove | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "Total files to remove: $($filesToRemove.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Continue with cleanup? (yes/no):" -ForegroundColor Yellow
    $confirm = Read-Host
    
    if ($confirm -eq "yes") {
        Write-Host ""
        Write-Host "Removing files..." -ForegroundColor Yellow
        
        $removed = 0
        $filesToRemove | ForEach-Object {
            try {
                Remove-Item $_.FullName -Force -ErrorAction Stop
                Write-Host "  OK Removed: $($_.Name)" -ForegroundColor Green
                $removed++
            } catch {
                Write-Host "  FAILED: $($_.Name) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  CLEANUP COMPLETE" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Removed $removed files" -ForegroundColor Green
    } else {
        Write-Host "Cleanup cancelled." -ForegroundColor Gray
    }
} else {
    Write-Host "No unnecessary files found to remove." -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
