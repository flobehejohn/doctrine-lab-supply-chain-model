$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$DashboardRoot = "labs/supply-chain/dashboard/executive"
$DataPath = Join-Path $DashboardRoot "data/executive-dashboard.json"
$IndexPath = Join-Path $DashboardRoot "index.html"
if (-not (Test-Path -LiteralPath $DataPath)) { throw "Dashboard data introuvable: $DataPath" }
if (-not (Test-Path -LiteralPath $IndexPath)) { throw "Dashboard HTML introuvable: $IndexPath" }
$Data = Get-Content -LiteralPath $DataPath -Raw | ConvertFrom-Json
$BuildManifest = [ordered]@{
    schemaVersion = "doctrine.executive-dashboard.build.v1"
    phase = 36
    dashboard = $DashboardRoot
    data = $DataPath
    index = $IndexPath
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    riskScore = $Data.scores.riskScore
    blastRadiusScore = $Data.scores.blastRadiusScore
    complianceScore = $Data.scores.complianceScore
    remediationReadiness = $Data.scores.remediationReadiness
    auditPackReadiness = $Data.scores.auditPackReadiness
}
$BuildManifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $DashboardRoot "dashboard-build.manifest.json") -Encoding utf8
Write-Host ""
Write-Host "Executive dashboard built"
Write-Host "========================="
Write-Host "Dashboard : $DashboardRoot/index.html"
Write-Host "Data      : $DataPath"
Write-Host ""
