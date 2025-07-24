#!/usr/bin/env pwsh

<#
.SYNOPSIS
Downloads validation reports from Azure App Service

.DESCRIPTION
This script downloads all validation and backtesting reports from your Azure-deployed
SentryCoin Flash Crash Predictor application.

.PARAMETER AppName
The name of your Azure App Service

.PARAMETER ResourceGroup
The Azure Resource Group containing your app

.PARAMETER OutputDir
Local directory to save downloaded files (default: ./azure-reports)

.EXAMPLE
./download-azure-reports.ps1 -AppName "sentrycoin-predictor" -ResourceGroup "rg-sentrycoin"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "./azure-reports"
)

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "📁 Created output directory: $OutputDir" -ForegroundColor Green
}

# Get app URL
Write-Host "🔍 Getting app information..." -ForegroundColor Yellow
$appUrl = az webapp show --name $AppName --resource-group $ResourceGroup --query "defaultHostName" --output tsv

if (!$appUrl) {
    Write-Error "❌ Could not find app: $AppName in resource group: $ResourceGroup"
    exit 1
}

$baseUrl = "https://$appUrl"
Write-Host "🌐 App URL: $baseUrl" -ForegroundColor Cyan

# Get list of available reports
Write-Host "📋 Fetching available reports..." -ForegroundColor Yellow
try {
    $reportsResponse = Invoke-RestMethod -Uri "$baseUrl/reports" -Method Get
    $reportFiles = $reportsResponse.availableReports
    
    Write-Host "📊 Found $($reportFiles.Count) report files:" -ForegroundColor Green
    foreach ($file in $reportFiles) {
        Write-Host "   - $file" -ForegroundColor White
    }
} catch {
    Write-Error "❌ Failed to get reports list: $($_.Exception.Message)"
    Write-Host "💡 Make sure your app is running and the /reports endpoint is available" -ForegroundColor Yellow
    exit 1
}

# Download each report file
Write-Host "`n⬇️ Downloading reports..." -ForegroundColor Yellow
$downloadedCount = 0

foreach ($filename in $reportFiles) {
    try {
        $downloadUrl = "$baseUrl/download/$filename"
        $outputPath = Join-Path $OutputDir $filename
        
        Write-Host "📥 Downloading: $filename" -ForegroundColor Cyan
        Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath
        
        $fileSize = (Get-Item $outputPath).Length
        Write-Host "✅ Downloaded: $filename ($fileSize bytes)" -ForegroundColor Green
        $downloadedCount++
        
    } catch {
        Write-Warning "⚠️ Failed to download $filename`: $($_.Exception.Message)"
    }
}

# Summary
Write-Host "`n🎉 Download Summary:" -ForegroundColor Green
Write-Host "   📁 Output Directory: $OutputDir" -ForegroundColor White
Write-Host "   📊 Files Downloaded: $downloadedCount / $($reportFiles.Count)" -ForegroundColor White
Write-Host "   🌐 Source: $baseUrl" -ForegroundColor White

# List downloaded files with details
Write-Host "`n📋 Downloaded Files:" -ForegroundColor Yellow
Get-ChildItem $OutputDir -File | ForEach-Object {
    $size = if ($_.Length -gt 1KB) { "{0:N1} KB" -f ($_.Length / 1KB) } else { "$($_.Length) bytes" }
    Write-Host "   📄 $($_.Name) - $size - $($_.LastWriteTime)" -ForegroundColor White
}

Write-Host "`n💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review the downloaded validation reports" -ForegroundColor White
Write-Host "   2. Analyze accuracy and performance metrics" -ForegroundColor White
Write-Host "   3. Use data for algorithm optimization" -ForegroundColor White
