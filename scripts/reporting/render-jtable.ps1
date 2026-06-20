param(
  [Parameter(Mandatory = $true)]
  [string]$View,

  [Parameter(Mandatory = $false)]
  [string]$Input,

  [Parameter(Mandatory = $false)]
  [string]$OutDir = ".doctrine/out/reporting/jtable"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Clean-Scalar {
  param([string]$Value)

  return $Value.Trim().Trim('"').Trim("'")
}

function Get-Prop {
  param(
    $Object,
    [string]$Name
  )

  if ($null -eq $Object) {
    return $null
  }

  $property = $Object.PSObject.Properties[$Name]

  if ($null -eq $property) {
    return $null
  }

  return $property.Value
}

function As-Array {
  param($Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    return @($Value)
  }

  return @($Value)
}

function As-Text {
  param($Value)

  if ($null -eq $Value) {
    return ""
  }

  if ($Value -is [System.Array]) {
    return (($Value | ForEach-Object { As-Text $_ }) -join ", ")
  }

  if ($Value.PSObject.TypeNames -contains "System.Management.Automation.PSCustomObject") {
    return ($Value | ConvertTo-Json -Compress -Depth 20)
  }

  return [string]$Value
}

function Read-ViewConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "View file not found: $Path"
  }

  $config = [ordered]@{}
  $columns = New-Object System.Collections.Generic.List[object]
  $currentKey = $null
  $currentLabel = $null

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()

    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    if ($line.StartsWith("#")) {
      continue
    }

    if ($line -match '^- key:\s*(.+)$') {
      if ($null -ne $currentKey) {
        $columns.Add([pscustomobject]@{
          key = $currentKey
          label = $currentLabel
        }) | Out-Null
      }

      $currentKey = Clean-Scalar $Matches[1]
      $currentLabel = $currentKey
      continue
    }

    if ($line -match '^label:\s*(.+)$' -and $null -ne $currentKey) {
      $currentLabel = Clean-Scalar $Matches[1]
      continue
    }

    if ($line -match '^([A-Za-z0-9_-]+):\s*(.*)$') {
      if ($null -ne $currentKey) {
        $columns.Add([pscustomobject]@{
          key = $currentKey
          label = $currentLabel
        }) | Out-Null

        $currentKey = $null
        $currentLabel = $null
      }

      $config[$Matches[1]] = Clean-Scalar $Matches[2]
      continue
    }
  }

  if ($null -ne $currentKey) {
    $columns.Add([pscustomobject]@{
      key = $currentKey
      label = $currentLabel
    }) | Out-Null
  }

  $config["columns"] = @($columns.ToArray())

  return [pscustomobject]$config
}

function Get-ReportValue {
  param(
    $Item,
    [string]$Key
  )

  switch ($Key) {
    "affectedNodes" {
      return As-Text (Get-Prop -Object $Item -Name "affectedNodes")
    }
    "evidenceRefs" {
      return As-Text (Get-Prop -Object $Item -Name "evidenceRefs")
    }
    "findingRefs" {
      return As-Text (Get-Prop -Object $Item -Name "findingRefs")
    }
    "commands" {
      $commands = As-Array (Get-Prop -Object $Item -Name "commands")

      if ($commands.Count -eq 0) {
        return ""
      }

      return (($commands | ForEach-Object {
        As-Text (Get-Prop -Object $_ -Name "command")
      }) -join " | ")
    }
    "rollback" {
      $rollback = Get-Prop -Object $Item -Name "rollback"

      if ($null -eq $rollback) {
        return ""
      }

      return As-Text (Get-Prop -Object $rollback -Name "description")
    }
    default {
      return As-Text (Get-Prop -Object $Item -Name $Key)
    }
  }
}

function Escape-MarkdownCell {
  param([string]$Value)

  return $Value.Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
}

function Write-MarkdownTable {
  param(
    [string]$Title,
    [object[]]$Columns,
    [object[]]$Rows,
    [string]$OutputPath
  )

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# $Title") | Out-Null
  $lines.Add("") | Out-Null

  if ($Rows.Count -eq 0) {
    $lines.Add("_No rows for this view._") | Out-Null
    $lines.Add("") | Out-Null
  } else {
    $header = "| " + (($Columns | ForEach-Object { Escape-MarkdownCell ([string]$_.label) }) -join " | ") + " |"
    $separator = "| " + (($Columns | ForEach-Object { "---" }) -join " | ") + " |"

    $lines.Add($header) | Out-Null
    $lines.Add($separator) | Out-Null

    foreach ($row in $Rows) {
      $cells = foreach ($column in $Columns) {
        Escape-MarkdownCell ([string](Get-Prop -Object $row -Name $column.label))
      }

      $lines.Add("| " + ($cells -join " | ") + " |") | Out-Null
    }

    $lines.Add("") | Out-Null
  }

  $parent = Split-Path -Parent $OutputPath

  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  Set-Content -Encoding utf8 -Path $OutputPath -Value $lines
}

$viewConfig = Read-ViewConfig -Path $View
$sourcePath = if ($Input) { $Input } else { $viewConfig.source }

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Input evidence-pack not found: $sourcePath"
}

$pack = Get-Content -Raw -LiteralPath $sourcePath | ConvertFrom-Json
$dataset = $viewConfig.dataset

switch ($dataset) {
  "findings" {
    $items = As-Array (Get-Prop -Object $pack -Name "findings")
  }
  "complianceImpacts" {
    $items = As-Array (Get-Prop -Object $pack -Name "complianceImpacts")
  }
  "remediations" {
    $items = As-Array (Get-Prop -Object $pack -Name "remediations")
  }
  "simulations" {
    $items = As-Array (Get-Prop -Object $pack -Name "simulations")
  }
  "drift" {
    $items = @()
  }
  default {
    throw "Unsupported dataset in view: $dataset"
  }
}

if ($viewConfig.filter -eq "critical") {
  $items = @($items | Where-Object {
    (Get-ReportValue -Item $_ -Key "severity") -eq "critical" -or
    (Get-ReportValue -Item $_ -Key "impact") -eq "critical"
  })
}

$columns = @($viewConfig.columns)

$rows = @(
  foreach ($item in $items) {
    $row = [ordered]@{}

    foreach ($column in $columns) {
      $row[$column.label] = Get-ReportValue -Item $item -Key $column.key
    }

    [pscustomobject]$row
  }
)

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$viewId = $viewConfig.viewId
$markdownPath = Join-Path $OutDir "$viewId.md"
$jsonPath = Join-Path $OutDir "$viewId.rows.json"

Write-Host ""
Write-Host "=== $($viewConfig.title) ==="
Write-Host "View   : $View"
Write-Host "Input  : $sourcePath"
Write-Host "Rows   : $($rows.Count)"
Write-Host ""

if ($rows.Count -gt 0) {
  $rows | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
} else {
  Write-Host "No rows for this view."
}

Write-MarkdownTable -Title $viewConfig.title -Columns $columns -Rows $rows -OutputPath $markdownPath
$rows | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 -Path $jsonPath

if (Get-Command jtable -ErrorAction SilentlyContinue) {
  Write-Host "Optional jtable command detected. Native fallback renderer still produced stable outputs."
} else {
  Write-Host "Optional jtable command not found. Native PowerShell fallback renderer used."
}

Write-Host ""
Write-Host "Markdown: $markdownPath"
Write-Host "JSON    : $jsonPath"
