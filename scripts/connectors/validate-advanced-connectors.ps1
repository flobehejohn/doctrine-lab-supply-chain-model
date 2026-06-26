$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot

$Errors = New-Object System.Collections.Generic.List[string]
function Add-ValidationError { param([string] $Message) $script:Errors.Add($Message) | Out-Null }
function Require-Path { param([string] $Path) if (-not (Test-Path -LiteralPath $Path)) { Add-ValidationError "Chemin manquant: $Path" } }

Require-Path "labs/supply-chain/connectors/connectors.index.json"
Require-Path "labs/supply-chain/connectors/README.md"
Require-Path "docs/23_ADVANCED_CONNECTORS.md"
Require-Path "scripts/connectors/list-advanced-connectors.ps1"
Require-Path "scripts/connectors/import-advanced-connector.ps1"

$Reports = @()
$IndexPath = "labs/supply-chain/connectors/connectors.index.json"

if (Test-Path -LiteralPath $IndexPath) {
    $Index = Get-Content -LiteralPath $IndexPath -Raw | ConvertFrom-Json
    if (@($Index.connectors).Count -lt 8) { Add-ValidationError "Au moins 8 connecteurs avances sont requis." }

    foreach ($Connector in @($Index.connectors)) {
        Require-Path $Connector.manifest
        Require-Path $Connector.fixture

        if ((Test-Path -LiteralPath $Connector.manifest) -and (Test-Path -LiteralPath $Connector.fixture)) {
            $Manifest = Get-Content -LiteralPath $Connector.manifest -Raw | ConvertFrom-Json
            $Fixture = Get-Content -LiteralPath $Connector.fixture -Raw | ConvertFrom-Json

            if ($Manifest.id -ne $Connector.id) { Add-ValidationError "Manifest id incoherent pour $($Connector.id)" }
            if ($Fixture.connector -ne $Connector.id) { Add-ValidationError "Fixture connector incoherent pour $($Connector.id)" }
            if (@($Fixture.entities).Count -lt 1) { Add-ValidationError "Fixture sans entities pour $($Connector.id)" }
            if (@($Fixture.findings).Count -lt 1) { Add-ValidationError "Fixture sans findings pour $($Connector.id)" }

            $Reports += [ordered]@{
                id = $Connector.id
                title = $Connector.title
                category = $Connector.category
                manifest = $Connector.manifest
                fixture = $Connector.fixture
                entities = @($Fixture.entities).Count
                findings = @($Fixture.findings).Count
            }
        }
    }
}

& pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector github-api -Mode fixture

$GitHubPackPath = "labs/supply-chain/connectors/out/github-api/evidence-pack.json"
Require-Path $GitHubPackPath

if (Test-Path -LiteralPath $GitHubPackPath) {
    $Pack = Get-Content -LiteralPath $GitHubPackPath -Raw | ConvertFrom-Json
    foreach ($Field in @("schemaVersion", "packId", "mode", "connector", "nodes", "edges", "evidence", "findings", "remediations", "complianceImpacts", "provenance")) {
        if ($null -eq $Pack.$Field) { Add-ValidationError "Champ obligatoire manquant dans $GitHubPackPath : $Field" }
    }
    if ($Pack.connector.id -ne "github-api") { Add-ValidationError "Le pack importe ne correspond pas au connecteur github-api." }
    if (@($Pack.nodes).Count -lt 1) { Add-ValidationError "Le pack github-api ne contient aucun node DREPS." }
    if (@($Pack.findings).Count -lt 1) { Add-ValidationError "Le pack github-api ne contient aucun finding DREPS." }
}

$Validation = [ordered]@{
    schemaVersion = "doctrine.advanced-connectors.validation.v1"
    phase = 35
    status = if ($Errors.Count -eq 0) { "passed" } else { "failed" }
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    connectorCount = @($Reports).Count
    requiredDoD = "At least one advanced connector can be read and converted to DREPS."
    importedConnector = "github-api"
    importedEvidencePack = $GitHubPackPath
    errors = $Errors
    connectors = $Reports
}

$ValidationPath = "labs/supply-chain/connectors/validation-report.json"
$Validation | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $ValidationPath -Encoding utf8

if ($Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Phase 35 validation failed"
    Write-Host "=========================="
    foreach ($Err in $Errors) { Write-Host "ERROR: $Err" }
    Write-Host ""
    Write-Host "Rapport: $ValidationPath"
    exit 1
}

Write-Host ""
Write-Host "Phase 35 validation passed"
Write-Host "=========================="
Write-Host "OK connectors.index.json present"
Write-Host "OK 8 advanced connectors declared"
Write-Host "OK manifests and fixtures present"
Write-Host "OK github-api fixture imported"
Write-Host "OK data converted to DREPS evidence-pack"
Write-Host "OK docs/23_ADVANCED_CONNECTORS.md present"
Write-Host ""
Write-Host "Rapport: $ValidationPath"
