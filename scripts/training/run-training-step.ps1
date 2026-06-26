param(
    [Parameter(Mandatory = $true)]
    [string] $Scenario,

    [Parameter(Mandatory = $false)]
    [string] $Step = "03-remediate"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$ScenarioPath = "labs/supply-chain/training/$Scenario/scenario.json"
if (-not (Test-Path -LiteralPath $ScenarioPath)) { throw "Scenario introuvable: $ScenarioPath" }
$ScenarioModel = Get-Content -LiteralPath $ScenarioPath -Raw | ConvertFrom-Json
$StepModel = $ScenarioModel.steps | Where-Object { $_.id -eq $Step } | Select-Object -First 1
if (-not $StepModel) { throw "Etape introuvable: $Step" }
$SourcePack = Join-Path (Split-Path -Parent $ScenarioPath) $StepModel.evidencePack
if (-not (Test-Path -LiteralPath $SourcePack)) { throw "Evidence-pack source introuvable: $SourcePack" }
$OutDir = "labs/supply-chain/training/out/$Scenario"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$DestPack = Join-Path $OutDir "evidence-pack.json"
Copy-Item -LiteralPath $SourcePack -Destination $DestPack -Force
$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DestPack).Hash.ToLowerInvariant()
$Manifest = [ordered]@{
    schemaVersion = "doctrine.training.run.v1"
    scenario = $Scenario
    step = $StepModel.id
    producedEvidencePack = $DestPack.Replace("\", "/")
    sha256 = $Hash
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
}
$Manifest | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath (Join-Path $OutDir "training-run.manifest.json") -Encoding utf8
Write-Host ""
Write-Host "Training step executed"
Write-Host "======================"
Write-Host "Scenario : $Scenario"
Write-Host "Step     : $($StepModel.id)"
Write-Host "Pack     : $DestPack"
Write-Host "SHA256   : $Hash"
Write-Host ""
