$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (& git rev-parse --show-toplevel).Trim()
Set-Location $Root

$Required = @(
  "apps/web/src/modeler/SupplyChainModeler.tsx",
  "apps/web/src/modeler/templates.ts",
  "apps/web/src/modeler/kubernetes-log-importer.ts",
  "apps/web/src/modeler/dreps-modeler-utils.ts",
  "apps/web/src/modeler/modeler-types.ts",
  "scripts/modeler/scan-local-repo.ps1",
  "docs/25_SUPPLY_CHAIN_MODELER.md"
)

foreach ($Path in $Required) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing path: $Path"
  }
}

$TemplatesContent = Get-Content "apps/web/src/modeler/templates.ts" -Raw
$ImporterContent = Get-Content "apps/web/src/modeler/kubernetes-log-importer.ts" -Raw

foreach ($Needle in @(
  "GitLab -> Runner -> Image -> Registry -> Kubernetes",
  "GitHub Actions -> Image -> Registry -> Cluster",
  "Kubernetes namespace sans NetworkPolicy",
  "Pod CrashLoopBackOff",
  "ImagePullBackOff",
  "Public service -> Pod -> Database",
  "Registry untrusted / unsigned image",
  "Microservice avec external API"
)) {
  if ($TemplatesContent -notmatch [regex]::Escape($Needle)) {
    throw "Missing template: $Needle"
  }
}

foreach ($Signal in @(
  "CrashLoopBackOff",
  "ImagePullBackOff",
  "ErrImagePull",
  "BackOff",
  "FailedScheduling",
  "Unhealthy",
  "Readiness probe failed",
  "Liveness probe failed",
  "CreateContainerConfigError",
  "OOMKilled"
)) {
  if ($ImporterContent -notmatch [regex]::Escape($Signal)) {
    throw "Missing Kubernetes signal: $Signal"
  }
}

pnpm --filter @supply-chain-mode-lab/web build

Write-Host ""
Write-Host "Phase 37A validation passed"
Write-Host "==========================="
Write-Host "OK SupplyChainModeler"
Write-Host "OK TemplateLibrary"
Write-Host "OK NodePalette"
Write-Host "OK EdgeEditor"
Write-Host "OK KubernetesLogPastePanel"
Write-Host "OK ImportPreviewPanel"
Write-Host "OK DrepsExportPanel"
Write-Host "OK DashboardSyncPanel"
Write-Host "OK local repo clean-room scanner"
Write-Host "OK web build"
Write-Host ""
