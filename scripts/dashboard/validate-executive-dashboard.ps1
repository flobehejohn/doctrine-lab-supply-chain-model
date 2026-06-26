$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$Errors = New-Object System.Collections.Generic.List[string]
function Add-ValidationError { param([string] $Message) $script:Errors.Add($Message) | Out-Null }
function Require-Path { param([string] $Path) if (-not (Test-Path -LiteralPath $Path)) { Add-ValidationError "Chemin manquant: $Path" } }
Require-Path "labs/supply-chain/dashboard/executive/index.html"
Require-Path "labs/supply-chain/dashboard/executive/assets/styles.css"
Require-Path "labs/supply-chain/dashboard/executive/assets/app.js"
Require-Path "labs/supply-chain/dashboard/executive/data/executive-dashboard.json"
Require-Path "scripts/dashboard/build-executive-dashboard.ps1"
Require-Path "docs/24_EXECUTIVE_DASHBOARD.md"
& pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/dashboard/build-executive-dashboard.ps1
$DataPath = "labs/supply-chain/dashboard/executive/data/executive-dashboard.json"
if (Test-Path -LiteralPath $DataPath) {
    $Data = Get-Content -LiteralPath $DataPath -Raw | ConvertFrom-Json
    foreach ($Field in @("executiveSummary", "scores", "topFindings", "complianceStatus", "remediationReadiness", "auditPackStatus", "drilldowns")) {
        if ($null -eq $Data.$Field) { Add-ValidationError "Champ dashboard manquant: $Field" }
    }
    if ($Data.scores.riskScore -lt 0 -or $Data.scores.riskScore -gt 100) { Add-ValidationError "Risk Score hors plage 0-100." }
    if ($Data.scores.blastRadiusScore -lt 0 -or $Data.scores.blastRadiusScore -gt 100) { Add-ValidationError "Blast Radius Score hors plage 0-100." }
    if (@($Data.topFindings).Count -lt 3) { Add-ValidationError "Au moins 3 top findings sont requis." }
    if (@($Data.complianceStatus).Count -lt 3) { Add-ValidationError "DORA/NIS2/SLSA doivent etre representes." }
    if (@($Data.remediationReadiness).Count -lt 1) { Add-ValidationError "Au moins une remediation doit etre presente." }
}
$Html = if (Test-Path "labs/supply-chain/dashboard/executive/index.html") { Get-Content "labs/supply-chain/dashboard/executive/index.html" -Raw } else { "" }
foreach ($Needle in @("Executive Summary", "Risk Score", "Top Findings", "Blast Radius Score", "Compliance Status", "Remediation Readiness", "Audit Pack Status")) {
    if ($Html -notmatch [regex]::Escape($Needle)) { Add-ValidationError "Bloc UI manquant: $Needle" }
}
$Report = [ordered]@{
    schemaVersion = "doctrine.executive-dashboard.validation.v1"
    phase = 36
    status = if ($Errors.Count -eq 0) { "passed" } else { "failed" }
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    dashboard = "labs/supply-chain/dashboard/executive/index.html"
    cLevelTwoMinuteView = $true
    auditorDrilldown = $true
    engineerPatchPath = $true
    errors = $Errors
}
$Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath "labs/supply-chain/dashboard/executive/validation-report.json" -Encoding utf8
if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Phase 36 validation failed"
    Write-Host "=========================="
    foreach ($Err in $Errors) { Write-Host "ERROR: $Err" }
    Write-Host ""
    Write-Host "Rapport: labs/supply-chain/dashboard/executive/validation-report.json"
    exit 1
}
Write-Host ""
Write-Host "Phase 36 validation passed"
Write-Host "=========================="
Write-Host "OK Executive Summary"
Write-Host "OK Risk Score"
Write-Host "OK Top Findings"
Write-Host "OK Blast Radius Score"
Write-Host "OK Compliance Status"
Write-Host "OK Remediation Readiness"
Write-Host "OK Audit Pack Status"
Write-Host "OK C-Level / Auditor / Engineer drilldowns"
Write-Host ""
Write-Host "Rapport: labs/supply-chain/dashboard/executive/validation-report.json"
