#!/usr/bin/env pwsh

<#
.SYNOPSIS
Downloads detailed reports from SentryCoin v4.0 system

.DESCRIPTION
This script downloads all detailed reports including classifications, trades,
performance metrics, and system events from the SentryCoin v4.0 dual-strategy system.

.PARAMETER AppUrl
The URL of your deployed SentryCoin v4.0 application

.PARAMETER OutputDir
Local directory to save downloaded files (default: ./sentrycoin-reports)

.PARAMETER ReportType
Type of report to download: all, session, hourly, daily, trades (default: all)

.EXAMPLE
./download-detailed-reports.ps1 -AppUrl "https://your-app.onrender.com"

.EXAMPLE
./download-detailed-reports.ps1 -AppUrl "https://your-app.onrender.com" -ReportType "session"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$AppUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "./sentrycoin-reports",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "session", "hourly", "daily", "trades")]
    [string]$ReportType = "all"
)

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "📁 Created output directory: $OutputDir" -ForegroundColor Green
}

# Remove trailing slash from URL
$AppUrl = $AppUrl.TrimEnd('/')

Write-Host "🛡️ SentryCoin v4.0 Detailed Report Downloader" -ForegroundColor Cyan
Write-Host "📊 App URL: $AppUrl" -ForegroundColor White
Write-Host "📁 Output: $OutputDir" -ForegroundColor White
Write-Host "📋 Report Type: $ReportType" -ForegroundColor White

# Test connection to the app
Write-Host "`n🔍 Testing connection..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$AppUrl/status" -Method Get -TimeoutSec 10
    Write-Host "✅ Connected to SentryCoin v4.0" -ForegroundColor Green
    Write-Host "   Version: $($statusResponse.version)" -ForegroundColor White
    Write-Host "   Symbol: $($statusResponse.system.symbol)" -ForegroundColor White
    Write-Host "   Status: $($statusResponse.status)" -ForegroundColor White
} catch {
    Write-Error "❌ Failed to connect to $AppUrl"
    Write-Host "💡 Make sure your SentryCoin v4.0 app is running" -ForegroundColor Yellow
    exit 1
}

# Function to download and save a file
function Download-Report {
    param(
        [string]$Url,
        [string]$Filename,
        [string]$Description
    )
    
    try {
        Write-Host "📥 Downloading: $Description" -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $Url -OutFile (Join-Path $OutputDir $Filename) -PassThru
        
        $fileSize = (Get-Item (Join-Path $OutputDir $Filename)).Length
        Write-Host "✅ Downloaded: $Filename ($fileSize bytes)" -ForegroundColor Green
        return $true
    } catch {
        Write-Warning "⚠️ Failed to download $Description`: $($_.Exception.Message)"
        return $false
    }
}

# Function to download JSON data and save
function Download-JsonReport {
    param(
        [string]$Url,
        [string]$Filename,
        [string]$Description
    )
    
    try {
        Write-Host "📥 Downloading: $Description" -ForegroundColor Cyan
        $data = Invoke-RestMethod -Uri $Url -Method Get
        
        $jsonContent = $data | ConvertTo-Json -Depth 10
        $outputPath = Join-Path $OutputDir $Filename
        $jsonContent | Out-File -FilePath $outputPath -Encoding UTF8
        
        $fileSize = (Get-Item $outputPath).Length
        Write-Host "✅ Downloaded: $Filename ($fileSize bytes)" -ForegroundColor Green
        return $true
    } catch {
        Write-Warning "⚠️ Failed to download $Description`: $($_.Exception.Message)"
        return $false
    }
}

$downloadedCount = 0
$totalAttempts = 0

# Download system status and performance
Write-Host "`n📊 Downloading System Reports..." -ForegroundColor Yellow

if ($ReportType -eq "all" -or $ReportType -eq "session") {
    $totalAttempts++
    if (Download-JsonReport "$AppUrl/status" "system_status.json" "System Status") {
        $downloadedCount++
    }
    
    $totalAttempts++
    if (Download-JsonReport "$AppUrl/performance" "performance_summary.json" "Performance Summary") {
        $downloadedCount++
    }
    
    $totalAttempts++
    if (Download-JsonReport "$AppUrl/classifications" "classification_stats.json" "Classification Statistics") {
        $downloadedCount++
    }
}

# Download session report
if ($ReportType -eq "all" -or $ReportType -eq "session") {
    Write-Host "`n📋 Downloading Session Report..." -ForegroundColor Yellow
    $totalAttempts++
    if (Download-Report "$AppUrl/reports/session" "session_report.json" "Complete Session Report") {
        $downloadedCount++
    }
}

# Generate and download hourly report
if ($ReportType -eq "all" -or $ReportType -eq "hourly") {
    Write-Host "`n⏰ Generating Hourly Report..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$AppUrl/reports/hourly" -Method Get | Out-Null
        Write-Host "✅ Hourly report generated" -ForegroundColor Green
    } catch {
        Write-Warning "⚠️ Failed to generate hourly report"
    }
}

# Generate and download daily report
if ($ReportType -eq "all" -or $ReportType -eq "daily") {
    Write-Host "`n📅 Generating Daily Report..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$AppUrl/reports/daily" -Method Get | Out-Null
        Write-Host "✅ Daily report generated" -ForegroundColor Green
    } catch {
        Write-Warning "⚠️ Failed to generate daily report"
    }
}

# Get list of available reports and download them
Write-Host "`n📋 Downloading Available Report Files..." -ForegroundColor Yellow
try {
    $reportsResponse = Invoke-RestMethod -Uri "$AppUrl/reports" -Method Get
    $reportFiles = $reportsResponse.availableReports
    
    Write-Host "📊 Found $($reportFiles.Count) report files:" -ForegroundColor Green
    foreach ($file in $reportFiles) {
        Write-Host "   - $file" -ForegroundColor White
    }
    
    # Download each report file
    foreach ($filename in $reportFiles) {
        $totalAttempts++
        if (Download-Report "$AppUrl/download/$filename" $filename "Report File: $filename") {
            $downloadedCount++
        }
    }
} catch {
    Write-Warning "⚠️ Failed to get reports list: $($_.Exception.Message)"
}

# Generate summary report
Write-Host "`n📊 Generating Download Summary..." -ForegroundColor Yellow
$summaryReport = @{
    downloadTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    appUrl = $AppUrl
    reportType = $ReportType
    outputDirectory = $OutputDir
    filesDownloaded = $downloadedCount
    totalAttempts = $totalAttempts
    successRate = if ($totalAttempts -gt 0) { [math]::Round(($downloadedCount / $totalAttempts) * 100, 2) } else { 0 }
    downloadedFiles = @()
}

# List all downloaded files with details
Get-ChildItem $OutputDir -File | ForEach-Object {
    $fileInfo = @{
        name = $_.Name
        size = $_.Length
        sizeFormatted = if ($_.Length -gt 1KB) { "{0:N1} KB" -f ($_.Length / 1KB) } else { "$($_.Length) bytes" }
        lastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    }
    $summaryReport.downloadedFiles += $fileInfo
}

# Save summary report
$summaryJson = $summaryReport | ConvertTo-Json -Depth 5
$summaryPath = Join-Path $OutputDir "download_summary.json"
$summaryJson | Out-File -FilePath $summaryPath -Encoding UTF8

# Display final summary
Write-Host "`n🎉 Download Summary:" -ForegroundColor Green
Write-Host "   📁 Output Directory: $OutputDir" -ForegroundColor White
Write-Host "   📊 Files Downloaded: $downloadedCount / $totalAttempts" -ForegroundColor White
Write-Host "   📈 Success Rate: $($summaryReport.successRate)%" -ForegroundColor White
Write-Host "   🌐 Source: $AppUrl" -ForegroundColor White

Write-Host "`n📋 Downloaded Files:" -ForegroundColor Yellow
foreach ($file in $summaryReport.downloadedFiles) {
    Write-Host "   📄 $($file.name) - $($file.sizeFormatted) - $($file.lastModified)" -ForegroundColor White
}

Write-Host "`n💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review the downloaded reports in: $OutputDir" -ForegroundColor White
Write-Host "   2. Analyze trading performance and classification accuracy" -ForegroundColor White
Write-Host "   3. Use session_report.json for comprehensive analysis" -ForegroundColor White
Write-Host "   4. Check download_summary.json for download details" -ForegroundColor White

if ($downloadedCount -eq 0) {
    Write-Host "`n⚠️ No files were downloaded. Check your app URL and ensure SentryCoin v4.0 is running." -ForegroundColor Yellow
} elseif ($downloadedCount -lt $totalAttempts) {
    Write-Host "`n⚠️ Some downloads failed. Check the warnings above for details." -ForegroundColor Yellow
} else {
    Write-Host "`n🎉 All reports downloaded successfully!" -ForegroundColor Green
}
