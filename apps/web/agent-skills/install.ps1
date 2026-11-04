param(
  [ValidateSet('Both', 'Codex', 'Claude')]
  [string]$Target = 'Both'
)

$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'skills'
$names = @(
  'ui-ux-director',
  'ui-role-flow',
  'ui-mock-contract',
  'ui-vietnamese-content',
  'ui-visual-direction',
  'ui-interaction-build',
  'ui-accessibility-check',
  'ui-browser-proof',
  'gop-code-voice'
)

$locations = @()
if ($Target -in @('Both', 'Codex')) {
  $codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  $locations += [pscustomobject]@{ Name = 'Codex'; Path = (Join-Path $codexRoot 'skills') }
}
if ($Target -in @('Both', 'Claude')) {
  $locations += [pscustomobject]@{ Name = 'Claude Code'; Path = (Join-Path $env:USERPROFILE '.claude/skills') }
}

foreach ($location in $locations) {
  New-Item -ItemType Directory -Path $location.Path -Force | Out-Null
  $installNames = if ($location.Name -eq 'Codex') {
    $names + @('gop-project-director', 'gop-debugging', 'gop-acceptance-audit', 'gop-ai-evaluation')
  } else { $names }
  foreach ($name in $installNames) {
    $from = Join-Path (Join-Path $source $name) 'SKILL.md'
    if (-not (Test-Path -LiteralPath $from -PathType Leaf)) { throw "Thiếu source: $from" }
    $folder = Join-Path $location.Path $name
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    $to = Join-Path $folder 'SKILL.md'
    if ((Test-Path -LiteralPath $to) -and
        ((Get-FileHash -LiteralPath $from).Hash -ne (Get-FileHash -LiteralPath $to).Hash)) {
      $backup = Join-Path $folder 'SKILL.before-ui-suite.md'
      if (-not (Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $to -Destination $backup
      }
    }
    Copy-Item -LiteralPath $from -Destination $to -Force
    Write-Output "$($location.Name): $name"
  }
}

# Tên cũ chỉ còn trong Codex; Claude Code không nhận tên skill chứa "claude".
if ($Target -in @('Both', 'Codex')) {
  $legacyFrom = Join-Path $PSScriptRoot 'compat/ui-ux-claude-code/SKILL.md'
  $legacyFolder = Join-Path $codexRoot 'skills/ui-ux-claude-code'
  New-Item -ItemType Directory -Path $legacyFolder -Force | Out-Null
  $legacyTo = Join-Path $legacyFolder 'SKILL.md'
  if ((Test-Path -LiteralPath $legacyTo) -and
      ((Get-FileHash -LiteralPath $legacyFrom).Hash -ne (Get-FileHash -LiteralPath $legacyTo).Hash)) {
    $backup = Join-Path $legacyFolder 'SKILL.before-ui-suite.md'
    if (-not (Test-Path -LiteralPath $backup)) {
      Copy-Item -LiteralPath $legacyTo -Destination $backup
    }
  }
  Copy-Item -LiteralPath $legacyFrom -Destination $legacyTo -Force
  Write-Output 'Codex: ui-ux-claude-code (tên cũ → ui-ux-director)'
}
