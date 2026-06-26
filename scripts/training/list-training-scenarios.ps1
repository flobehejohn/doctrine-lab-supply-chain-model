$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$IndexPath = "labs/supply-chain/training/training.index.json"
if (-not (Test-Path -LiteralPath $IndexPath)) { throw "Index training introuvable: $IndexPath" }
$Index = Get-Content -LiteralPath $IndexPath -Raw | ConvertFrom-Json
Write-Host ""
Write-Host "Doctrine Supply Chain Training Mode"
Write-Host "=================================="
Write-Host ""
foreach ($Scenario in $Index.scenarios) {
    Write-Host ("[{0}] {1}" -f $Scenario.id, $Scenario.title)
    Write-Host ("    Track    : {0}" -f $Scenario.track)
    Write-Host ("    Objectif : {0}" -f $Scenario.objective)
    Write-Host ""
}
