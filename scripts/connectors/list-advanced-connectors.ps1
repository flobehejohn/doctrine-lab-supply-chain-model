$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$IndexPath = "labs/supply-chain/connectors/connectors.index.json"
if (-not (Test-Path -LiteralPath $IndexPath)) { throw "Connectors index introuvable: $IndexPath" }
$Index = Get-Content -LiteralPath $IndexPath -Raw | ConvertFrom-Json
Write-Host ""
Write-Host "Doctrine Advanced Connectors"
Write-Host "============================"
Write-Host ""
foreach ($Connector in @($Index.connectors)) {
    Write-Host ("[{0}] {1}" -f $Connector.id, $Connector.title)
    Write-Host ("    Category : {0}" -f $Connector.category)
    Write-Host ("    Manifest : {0}" -f $Connector.manifest)
    Write-Host ("    Fixture  : {0}" -f $Connector.fixture)
    Write-Host ""
}
