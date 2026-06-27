param(
  [Parameter(Mandatory = $true)]
  [string] $RepoPath,

  [Parameter(Mandatory = $false)]
  [string] $OutputPath = "apps/web/public/evidence-pack.json",

  [Parameter(Mandatory = $false)]
  [string] $PackId = "local-repo-supply-chain"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (& git rev-parse --show-toplevel).Trim()
Set-Location $Root

if (-not (Test-Path -LiteralPath $RepoPath)) {
  throw "RepoPath introuvable: $RepoPath"
}

$ResolvedRepo = (Resolve-Path -LiteralPath $RepoPath).Path
$RepoName = Split-Path -Leaf $ResolvedRepo
$Now = (Get-Date).ToUniversalTime().ToString("o")

function SafeId([string] $Value) {
  return ($Value.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
}

$RepoNode = SafeId "repo-$RepoName"
$HasCi = (Test-Path (Join-Path $ResolvedRepo ".github/workflows")) -or
         (Test-Path (Join-Path $ResolvedRepo ".gitlab-ci.yml")) -or
         (Test-Path (Join-Path $ResolvedRepo "Jenkinsfile"))

$Nodes = @(
  [ordered]@{
    id = $RepoNode
    type = "repository"
    name = $RepoName
    criticality = "high"
    metadata = @{ path = $ResolvedRepo }
  }
)

$Edges = @()
$Evidence = @(
  [ordered]@{
    id = "evidence-repo-scan"
    type = "source_file"
    source = $ResolvedRepo
    createdAt = $Now
    metadata = @{ scanMode = "clean-room-local" }
  }
)

$Findings = @()

if (-not $HasCi) {
  $Findings += [ordered]@{
    id = "finding-missing-ci"
    title = "No CI workflow detected"
    severity = "medium"
    status = "open"
    affectedNodes = @($RepoNode)
    evidenceRefs = @("evidence-repo-scan")
    description = "No common CI workflow file was found."
    metadata = @{ generatedBy = "scan-local-repo.ps1" }
  }
}

$Dockerfiles = Get-ChildItem -LiteralPath $ResolvedRepo -Recurse -File -Filter "Dockerfile" -ErrorAction SilentlyContinue | Select-Object -First 5

foreach ($Dockerfile in $Dockerfiles) {
  $Relative = [System.IO.Path]::GetRelativePath($ResolvedRepo, $Dockerfile.FullName)
  $ImageNode = SafeId "image-$Relative"
  $EvidenceImage = "evidence-$ImageNode"

  $Nodes += [ordered]@{
    id = $ImageNode
    type = "container_image"
    name = "Image inferred from $Relative"
    criticality = "high"
    metadata = @{ dockerfile = $Relative }
  }

  $Edges += [ordered]@{
    id = "edge-$RepoNode-builds-$ImageNode"
    type = "builds"
    source = $RepoNode
    target = $ImageNode
    metadata = @{}
  }

  $Evidence += [ordered]@{
    id = $EvidenceImage
    type = "source_file"
    source = $Relative
    createdAt = $Now
    metadata = @{}
  }

  $Content = Get-Content -LiteralPath $Dockerfile.FullName -Raw

  if ($Content -match "FROM\s+.+:latest") {
    $Findings += [ordered]@{
      id = "finding-dockerfile-latest-$ImageNode"
      title = "Dockerfile uses latest tag"
      severity = "high"
      status = "open"
      affectedNodes = @($ImageNode)
      evidenceRefs = @($EvidenceImage)
      description = "A Dockerfile base image uses the mutable latest tag."
      metadata = @{ generatedBy = "scan-local-repo.ps1" }
    }
  }
}

$Remediations = @()
$ComplianceImpacts = @()

foreach ($Finding in $Findings) {
  if ($Finding.severity -in @("high", "critical")) {
    $Remediations += [ordered]@{
      id = "remediate-$($Finding.id)"
      findingId = $Finding.id
      affectedNodes = $Finding.affectedNodes
      strategy = "Review the finding and add an appropriate remediation patch."
      risk = "medium"
      commands = @()
      approvalRequired = $true
      verification = [ordered]@{
        expectedOutcome = "Finding is no longer present after re-scan."
        commands = @(
          [ordered]@{
            id = "cmd-verify-$($Finding.id)"
            description = "Re-run scanner."
            command = "pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/modeler/scan-local-repo.ps1 -RepoPath <repo>"
            riskLevel = "read_only"
            approvalRequired = $false
          }
        )
      }
      rollback = [ordered]@{
        description = "Revert remediation commit."
        commands = @(
          [ordered]@{
            id = "cmd-rollback-$($Finding.id)"
            description = "Revert last commit."
            command = "git revert HEAD"
            riskLevel = "local_write"
            approvalRequired = $true
          }
        )
      }
      metadata = @{ generatedBy = "scan-local-repo.ps1" }
    }

    $ComplianceImpacts += [ordered]@{
      id = "impact-$($Finding.id)"
      framework = "SLSA"
      control = "artifact-integrity"
      impact = $Finding.severity
      findingRefs = @($Finding.id)
      affectedNodes = $Finding.affectedNodes
      rationale = "Finding generated from clean-room local repository scan."
    }
  }
}

$Pack = [ordered]@{
  schemaVersion = "dreps.supplychain.v1"
  packId = $PackId
  createdAt = $Now
  mode = "imported"
  nodes = $Nodes
  edges = $Edges
  evidence = $Evidence
  findings = $Findings
  remediations = $Remediations
  complianceImpacts = $ComplianceImpacts
  documentation = @()
  simulations = @()
  commandRefs = @()
  runbooks = @()
  workflows = @()
  graphMetrics = [ordered]@{
    nodeCount = $Nodes.Count
    edgeCount = $Edges.Count
    findingCount = $Findings.Count
    remediationCount = $Remediations.Count
    complianceImpactCount = $ComplianceImpacts.Count
  }
  toolchain = @{ scanner = "scripts/modeler/scan-local-repo.ps1" }
  provenance = @{
    source = $ResolvedRepo
    generatedBy = "scan-local-repo.ps1"
    cleanRoom = $true
  }
}

$OutDir = Split-Path -Parent $OutputPath
if ($OutDir -and -not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$Pack | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $OutputPath -Encoding utf8

Write-Host ""
Write-Host "Local repo supply chain scan complete"
Write-Host "===================================="
Write-Host "Repo     : $ResolvedRepo"
Write-Host "Output   : $OutputPath"
Write-Host "Nodes    : $($Nodes.Count)"
Write-Host "Edges    : $($Edges.Count)"
Write-Host "Findings : $($Findings.Count)"
Write-Host ""
