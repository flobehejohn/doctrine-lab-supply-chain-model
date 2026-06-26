param(
    [Parameter(Mandatory = $false)]
    [string] $Connector = "github-api",

    [Parameter(Mandatory = $false)]
    [string] $InputPath,

    [Parameter(Mandatory = $false)]
    [ValidateSet("fixture", "live")]
    [string] $Mode = "fixture",

    [Parameter(Mandatory = $false)]
    [string] $Repository,

    [Parameter(Mandatory = $false)]
    [string] $OutputRoot = "labs/supply-chain/connectors/out"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot

function Write-JsonFile {
    param([string] $Path, [object] $Data)
    $Dir = Split-Path -Parent $Path
    if ($Dir -and -not (Test-Path -LiteralPath $Dir)) { New-Item -ItemType Directory -Force -Path $Dir | Out-Null }
    $Data | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding utf8
}

function New-LiveGitHubPayload {
    param([string] $Repository)

    if (-not $Repository) { throw "Repository requis en mode live pour github-api. Exemple: -Repository owner/repo" }
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI introuvable. Installe gh ou utilise -Mode fixture." }

    $Repo = gh api "repos/$Repository" | ConvertFrom-Json

    $SecretScanningStatus = "unknown"
    if ($Repo.security_and_analysis -and $Repo.security_and_analysis.secret_scanning) {
        $SecretScanningStatus = $Repo.security_and_analysis.secret_scanning.status
    }

    $FindingSeverity = if ($SecretScanningStatus -eq "enabled") { "low" } else { "high" }

    return [ordered]@{
        schemaVersion = "doctrine.external.connector.fixture.v1"
        connector = "github-api"
        externalTool = "GitHub API"
        collectedAt = (Get-Date).ToUniversalTime().ToString("o")
        source = [ordered]@{ mode = "live"; repository = $Repository }
        entities = @(
            [ordered]@{ id = "github-api-tool"; type = "external_tool"; label = "GitHub API"; status = "observed"; criticality = "medium"; evidenceRefs = @("github-api-live") },
            [ordered]@{ id = "github-api-repository"; type = "repository"; label = $Repo.full_name; status = "observed"; criticality = "high"; evidenceRefs = @("github-api-live") }
        )
        relationships = @(
            [ordered]@{ id = "github-api-imports-repository"; source = "github-api-tool"; target = "github-api-repository"; type = "imports"; evidenceRefs = @("github-api-live") }
        )
        findings = @(
            [ordered]@{ id = "github-secret-scanning-status"; title = "GitHub secret scanning status is $SecretScanningStatus"; severity = $FindingSeverity; status = "open"; affectedNodes = @("github-api-repository"); evidenceRefs = @("github-api-live"); remediationRefs = @("github-api-remediation"); rationale = "Live GitHub API import converted to normalized DREPS finding." }
        )
        complianceImpacts = @(
            [ordered]@{ id = "github-api-compliance-impact"; framework = "SLSA/NIS2"; control = "Repository-Supply-Chain-Controls"; status = "review"; findingId = "github-secret-scanning-status"; affectedNodes = @("github-api-repository"); evidenceRefs = @("github-api-live"); rationale = "Repository security metadata imported from GitHub API." }
        )
        remediations = @(
            [ordered]@{ id = "github-api-remediation"; findingId = "github-secret-scanning-status"; affectedNodes = @("github-api-repository"); strategy = "Review repository security settings and enable required GitHub security features."; approvalRequired = $true; verification = @("Re-run live GitHub API import."); rollback = @("Restore previous repository security setting if needed.") }
        )
        raw = $Repo
    }
}

if ($Mode -eq "live" -and $Connector -ne "github-api") {
    throw "Le mode live est seulement implemente pour github-api dans cette phase."
}

if ($Mode -eq "live") {
    $Payload = New-LiveGitHubPayload -Repository $Repository
    $SourceLabel = "live:github-api:$Repository"
} else {
    $ManifestPath = "labs/supply-chain/connectors/$Connector/connector.manifest.json"
    if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "Manifest connecteur introuvable: $ManifestPath" }
    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    if (-not $InputPath) { $InputPath = $Manifest.fixturePath }
    if (-not (Test-Path -LiteralPath $InputPath)) { throw "Fixture introuvable: $InputPath" }
    $Payload = Get-Content -LiteralPath $InputPath -Raw | ConvertFrom-Json
    $SourceLabel = $InputPath
}

$OutDir = Join-Path $OutputRoot $Connector
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$EvidenceId = "$Connector-imported-payload"

$EvidencePack = [ordered]@{
    schemaVersion = "dreps.supplychain.connectors.v1"
    packId = "$Connector-advanced-connector-import"
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    mode = "advanced-connector-import"
    connector = [ordered]@{
        id = $Payload.connector
        externalTool = $Payload.externalTool
        source = $Payload.source
        mode = $Mode
    }
    nodes = @($Payload.entities)
    edges = @($Payload.relationships)
    evidence = @(
        [ordered]@{
            id = $EvidenceId
            type = "advanced_connector_payload"
            path = $SourceLabel
            producedBy = "scripts/connectors/import-advanced-connector.ps1"
            description = "Raw advanced connector payload converted to DREPS."
        }
    )
    findings = @($Payload.findings)
    remediations = @($Payload.remediations)
    complianceImpacts = @($Payload.complianceImpacts)
    documentation = @(
        [ordered]@{ id = "$Connector-doc"; title = "$Connector connector documentation"; path = "labs/supply-chain/connectors/$Connector/README.md" }
    )
    simulations = @()
    commandRefs = @(
        [ordered]@{ id = "$Connector-import-command"; shell = "pwsh"; command = "pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/connectors/import-advanced-connector.ps1 -Connector $Connector"; riskLevel = "read_only"; approvalRequired = $false }
    )
    runbooks = @()
    workflows = @(
        [ordered]@{ id = "$Connector-import-workflow"; title = "$Connector import workflow"; steps = @("read-external-payload", "normalize-to-dreps", "write-evidence-pack", "validate") }
    )
    graphMetrics = [ordered]@{
        nodeCount = @($Payload.entities).Count
        edgeCount = @($Payload.relationships).Count
        findingCount = @($Payload.findings).Count
        remediationCount = @($Payload.remediations).Count
        complianceImpactCount = @($Payload.complianceImpacts).Count
    }
    toolchain = [ordered]@{ powershell = $PSVersionTable.PSVersion.ToString(); importer = "advanced-connectors-phase35" }
    provenance = [ordered]@{ source = $SourceLabel; generatedBy = "import-advanced-connector.ps1"; cleanRoom = $true }
}

$OutPack = Join-Path $OutDir "evidence-pack.json"
$OutRaw = Join-Path $OutDir "raw.external-payload.json"

Write-JsonFile -Path $OutPack -Data $EvidencePack
Write-JsonFile -Path $OutRaw -Data $Payload

$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutPack).Hash.ToLowerInvariant()

$Manifest = [ordered]@{
    schemaVersion = "doctrine.advanced-connectors.import-manifest.v1"
    connector = $Connector
    mode = $Mode
    evidencePack = $OutPack.Replace("\", "/")
    sha256 = $Hash
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
}

Write-JsonFile -Path (Join-Path $OutDir "import.manifest.json") -Data $Manifest

Write-Host ""
Write-Host "Advanced connector imported"
Write-Host "==========================="
Write-Host "Connector : $Connector"
Write-Host "Mode      : $Mode"
Write-Host "Pack      : $OutPack"
Write-Host "SHA256    : $Hash"
Write-Host ""
