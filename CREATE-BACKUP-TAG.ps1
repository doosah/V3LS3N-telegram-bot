# PowerShell script to create a stable version tag for telegram-bot
$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREATE STABLE VERSION TAG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path "index.js")) {
    Write-Host "ERROR: index.js not found. Are you in the correct directory?" -ForegroundColor Red
    Pop-Location
    exit 1
}

try {
    # Get current commit hash
    $currentCommit = git rev-parse --short HEAD
    Write-Host "Current commit: $currentCommit" -ForegroundColor Gray
    Write-Host ""
    
    # Create tag name with date
    $date = Get-Date -Format "yyyy-MM-dd"
    $tagName = "stable-$date"
    
    Write-Host "Creating tag: $tagName" -ForegroundColor Yellow
    Write-Host "This will mark current version as stable backup" -ForegroundColor Gray
    Write-Host ""
    
    # Create annotated tag
    $tagMessage = "Stable version backup - $date`n`nThis version is known to work correctly:`n- Telegram bot working`n- Reports sending correctly`n- Both operational and personnel reports working`n- Clean codebase without temporary files"
    
    git tag -a $tagName -m $tagMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create tag" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "OK: Tag created locally" -ForegroundColor Green
    Write-Host ""
    
    # Push tag to GitHub
    Write-Host "Pushing tag to GitHub..." -ForegroundColor Yellow
    git push origin $tagName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to push tag. Try manually:" -ForegroundColor Yellow
        Write-Host "  git push origin $tagName" -ForegroundColor White
    } else {
        Write-Host "OK: Tag pushed to GitHub" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DONE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Stable version tag created: $tagName" -ForegroundColor Green
    Write-Host ""
    Write-Host "To restore this version later:" -ForegroundColor Yellow
    Write-Host "  git checkout $tagName" -ForegroundColor White
    Write-Host ""
    Write-Host "Or view tag on GitHub:" -ForegroundColor Yellow
    Write-Host "  https://github.com/doosah/V3LS3N-telegram-bot/releases/tag/$tagName" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "CRITICAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

