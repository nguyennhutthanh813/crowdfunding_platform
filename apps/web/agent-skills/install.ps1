param(
  [ValidateSet('Both', 'Codex', 'Claude', 'Kimi', 'All')]
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
  'gop-code-voice',
  'gop-git-workflow'
)

$locations = @()
if ($Target -in @('Both', 'Codex', 'All')) {
  $codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  $locations += [pscustomobject]@{ Name = 'Codex'; Path = (Join-Path $codexRoot 'skills') }
}
if ($Target -in @('Both', 'Claude', 'All')) {
  $locations += [pscustomobject]@{ Name = 'Claude Code'; Path = (Join-Path $env:USERPROFILE '.claude/skills') }
}
if ($Target -in @('Kimi', 'All')) {
  $kimiRoot = if ($env:KIMI_CODE_HOME) { $env:KIMI_CODE_HOME } else { Join-Path $env:USERPROFILE '.kimi-code' }
  $locations += [pscustomobject]@{ Name = 'Kimi Code'; Path = (Join-Path $kimiRoot 'skills') }
}

foreach ($location in $locations) {
  New-Item -ItemType Directory -Path $location.Path -Force | Out-Null
  $installNames = if ($location.Name -eq 'Codex') {
    $names + @('gop-project-director', 'gop-debugging', 'gop-acceptance-audit', 'gop-ai-evaluation')
  } else { $names }
  foreach ($name in $installNames) {
    $fromFolder = Join-Path $source $name
    if (-not (Test-Path -LiteralPath (Join-Path $fromFolder 'SKILL.md') -PathType Leaf)) { throw "Thiếu source: $fromFolder" }
    $folder = Join-Path $location.Path $name
    foreach ($file in (Get-ChildItem -LiteralPath $fromFolder -File -Recurse)) {
      $relative = $file.FullName.Substring($fromFolder.Length).TrimStart('\', '/')
      $to = Join-Path $folder $relative
      $toFolder = Split-Path $to -Parent
      New-Item -ItemType Directory -Path $toFolder -Force | Out-Null
      if ((Test-Path -LiteralPath $to) -and
          ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $to).Hash)) {
        $backupName = [IO.Path]::GetFileNameWithoutExtension($to) + '.before-ui-suite' + [IO.Path]::GetExtension($to)
        $backup = Join-Path $toFolder $backupName
        if (-not (Test-Path -LiteralPath $backup)) {
          Copy-Item -LiteralPath $to -Destination $backup
        }
      }
      Copy-Item -LiteralPath $file.FullName -Destination $to -Force
    }
    Write-Output "$($location.Name): $name"
  }
}

# Tên cũ chỉ còn trong Codex; Claude Code không nhận tên skill chứa "claude".
if ($Target -in @('Both', 'Codex', 'All')) {
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
