param(
  [ValidateSet("plan", "render", "up", "down", "status")]
  [string]$Mode = "plan"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

$Template = Join-Path $Here "docker-compose.template.yml"
$Rendered = Join-Path $Here "docker-compose.yml"

function Write-Step {
  param([string]$Message)
  Write-Host "[gitlab-local-lab] $Message"
}

function Assert-NoSecretEcho {
  if ($env:GITLAB_RUNNER_REGISTRATION_TOKEN) {
    Write-Step "Runner registration token detected in environment: ***REDACTED***"
  } else {
    Write-Step "Runner registration token not set. This is OK for planning/modeling mode."
  }
}

function Assert-Docker {
  $Docker = Get-Command docker -ErrorAction SilentlyContinue

  if (-not $Docker) {
    throw "Docker CLI not found. Install Docker Desktop or Docker Engine."
  }
}

function Render-Compose {
  if (-not (Test-Path $Template)) {
    throw "Missing template: $Template"
  }

  Copy-Item -Force $Template $Rendered
  Write-Step "Rendered docker-compose.yml from docker-compose.template.yml"
}

Assert-NoSecretEcho

switch ($Mode) {
  "plan" {
    Write-Step "Plan only. No container will be started."
    Write-Step "GitLab URL: http://localhost:8080"
    Write-Step "Registry URL: http://localhost:5050"
    Write-Step "SSH port: 2222"
    Write-Step "Sample project: sample-project/"
    Write-Step "Evidence model: evidence/evidence-pack.gitlab-local.json"
    Write-Step "Runbook: RUNBOOK.md"
    Write-Step "Security model: SECURITY_MODEL.md"
  }

  "render" {
    Render-Compose
  }

  "up" {
    Assert-Docker
    Render-Compose
    docker compose -f $Rendered up -d
    Write-Step "GitLab local lab starting."
    Write-Step "Wait for GitLab healthcheck before creating/importing projects."
  }

  "down" {
    Assert-Docker

    if (Test-Path $Rendered) {
      docker compose -f $Rendered down
    } else {
      Write-Step "No rendered docker-compose.yml found."
    }
  }

  "status" {
    Assert-Docker

    if (Test-Path $Rendered) {
      docker compose -f $Rendered ps
    } else {
      Write-Step "No rendered docker-compose.yml found."
    }
  }
}
