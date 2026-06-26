$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot
$Errors = New-Object System.Collections.Generic.List[string]
function Add-ValidationError { param([string] $Message) $script:Errors.Add($Message) | Out-Null }
function Require-Path { param([string] $Path) if (-not (Test-Path -LiteralPath $Path)) { Add-ValidationError "Chemin manquant: $Path" } }
Require-Path "labs/supply-chain/training/training.index.json"
Require-Path "labs/supply-chain/training/README.md"
Require-Path "docs/18_TRAINING_MODE.md"
Require-Path "decks/training-supply-chain.marp.md"
Require-Path "scripts/training/list-training-scenarios.ps1"
Require-Path "scripts/training/run-training-step.ps1"
$ScenarioReports = @()
$IndexPath = "labs/supply-chain/training/training.index.json"
if (Test-Path -LiteralPath $IndexPath) {
    $Index = Get-Content -LiteralPath $IndexPath -Raw | ConvertFrom-Json
    if (@($Index.scenarios).Count -lt 7) { Add-ValidationError "Au moins 7 scenarios sont requis." }
    foreach ($Scenario in @($Index.scenarios)) {
        $ScenarioPath = $Scenario.scenarioFile
        if (-not (Test-Path -LiteralPath $ScenarioPath)) { Add-ValidationError "scenario.json manquant: $ScenarioPath"; continue }
        $ScenarioModel = Get-Content -LiteralPath $ScenarioPath -Raw | ConvertFrom-Json
        if (@($ScenarioModel.steps).Count -lt 4) { Add-ValidationError "Scenario incomplet: $($Scenario.id)" }
        $PreviousHash = $null
        $StepReports = @()
        foreach ($Step in @($ScenarioModel.steps)) {
            $PackPath = Join-Path (Split-Path -Parent $ScenarioPath) $Step.evidencePack
            if (-not (Test-Path -LiteralPath $PackPath)) { Add-ValidationError "Evidence-pack manquant: $PackPath"; continue }
            $Pack = Get-Content -LiteralPath $PackPath -Raw | ConvertFrom-Json
            foreach ($Field in @("schemaVersion", "packId", "mode", "nodes", "edges", "evidence", "findings", "remediations", "complianceImpacts", "provenance")) {
                if ($null -eq $Pack.$Field) { Add-ValidationError "Champ obligatoire manquant dans $PackPath : $Field" }
            }
            if ($Step.id -eq "02-assess" -and @($Pack.findings).Count -lt 1) { Add-ValidationError "02-assess sans finding: $($Scenario.id)" }
            if ($Step.id -eq "03-remediate") {
                if (@($Pack.remediations).Count -lt 1) {
                    Add-ValidationError "03-remediate sans remediation: $($Scenario.id)"
                } else {
                    foreach ($Remediation in @($Pack.remediations)) {
                        if (@($Remediation.verification).Count -lt 1) { Add-ValidationError "Remediation sans verification: $($Scenario.id)" }
                        if (@($Remediation.rollback).Count -lt 1) { Add-ValidationError "Remediation sans rollback: $($Scenario.id)" }
                    }
                }
            }
            $Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PackPath).Hash.ToLowerInvariant()
            if ($PreviousHash -and $PreviousHash -eq $Hash) { Add-ValidationError "Pack non modifie entre deux etapes: $($Scenario.id) / $($Step.id)" }
            $PreviousHash = $Hash
            $StepReports += [ordered]@{ step = $Step.id; evidencePack = $Step.evidencePack; sha256 = $Hash; findings = @($Pack.findings).Count; remediations = @($Pack.remediations).Count }
        }
        $ScenarioReports += [ordered]@{ id = $Scenario.id; title = $Scenario.title; steps = $StepReports }
    }
}
New-Item -ItemType Directory -Force -Path ".doctrine/out/training" | Out-Null
$Report = [ordered]@{
    schemaVersion = "doctrine.training.validation.v1"
    phase = 34
    status = if ($Errors.Count -eq 0) { "passed" } else { "failed" }
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    scenarioCount = @($ScenarioReports).Count
    errors = $Errors
    scenarios = $ScenarioReports
}
$Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath ".doctrine/out/training/training-validation-report.json" -Encoding utf8
if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Phase 34 validation failed"
    Write-Host "=========================="
    foreach ($Err in $Errors) { Write-Host "ERROR: $Err" }
    Write-Host ""
    Write-Host "Rapport: .doctrine/out/training/training-validation-report.json"
    exit 1
}
Write-Host ""
Write-Host "Phase 34 validation passed"
Write-Host "=========================="
Write-Host "OK training.index.json present"
Write-Host "OK 7 scenarios pedagogiques presents"
Write-Host "OK chaque scenario contient plusieurs etapes"
Write-Host "OK chaque etape produit ou modifie un evidence-pack"
Write-Host "OK etape assess avec finding"
Write-Host "OK etape remediate avec verification et rollback"
Write-Host "OK deck Marp present"
Write-Host "OK docs/18_TRAINING_MODE.md present"
Write-Host ""
Write-Host "Rapport: .doctrine/out/training/training-validation-report.json"
