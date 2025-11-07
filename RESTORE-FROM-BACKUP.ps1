# PowerShell script to restore from stable tag
$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTORE FROM STABLE TAG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path "index.js")) {
    Write-Host "ERROR: index.js not found. Are you in the correct directory?" -ForegroundColor Red
    Pop-Location
    exit 1
}

try {
    # List available tags
    Write-Host "Fetching tags from GitHub..." -ForegroundColor Yellow
    git fetch --tags origin
    
    Write-Host ""
    Write-Host "Available stable tags:" -ForegroundColor Cyan
    $tags = git tag -l "stable-*" | Sort-Object -Descending
    if ($tags.Count -eq 0) {
        Write-Host "  No stable tags found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Create a stable tag first:" -ForegroundColor Yellow
        Write-Host "  .\CREATE-BACKUP-TAG.ps1" -ForegroundColor White
        Pop-Location
        exit 1
    }
    
    $tagIndex = 1
    $tags | ForEach-Object {
        Write-Host "  [$tagIndex] $_" -ForegroundColor White
        $tagIndex++
    }
    Write-Host ""
    
    # Ask user to select tag
    Write-Host "Enter tag number to restore (or tag name):" -ForegroundColor Yellow
    $selection = Read-Host
    
    $selectedTag = $null
    
    # Check if it's a number
    if ($selection -match '^\d+$') {
        $tagNum = [int]$selection
        if ($tagNum -ge 1 -and $tagNum -le $tags.Count) {
            $selectedTag = $tags[$tagNum - 1]
        } else {
            Write-Host "ERROR: Invalid tag number" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    } else {
        # Check if it's a valid tag name
        if ($tags -contains $selection) {
            $selectedTag = $selection
        } else {
            Write-Host "ERROR: Tag '$selection' not found" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "WARNING: This will restore version: $selectedTag" -ForegroundColor Yellow
    Write-Host "All uncommitted changes will be lost!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Continue? (yes/no):" -ForegroundColor Yellow
    $confirm = Read-Host
    
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Gray
        Pop-Location
        exit 0
    }
    
    Write-Host ""
    Write-Host "Stashing local changes..." -ForegroundColor Yellow
    git stash push -m "Backup before restore to $selectedTag"
    
    Write-Host "Checking out tag: $selectedTag" -ForegroundColor Yellow
    git checkout $selectedTag
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to checkout tag" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  RESTORED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Current version: $selectedTag" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: You are in 'detached HEAD' state." -ForegroundColor Yellow
    Write-Host "To create a new branch from this tag:" -ForegroundColor Yellow
    Write-Host "  git checkout -b restore-$selectedTag" -ForegroundColor White
    Write-Host ""
    Write-Host "To return to main branch:" -ForegroundColor Yellow
    Write-Host "  git checkout main" -ForegroundColor White
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

