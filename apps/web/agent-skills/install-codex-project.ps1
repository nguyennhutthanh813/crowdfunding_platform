# Cài skill của nhóm và các skill chính thức/cộng đồng từ commit đã kiểm tra.
$ErrorActionPreference = 'Stop'
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$skillRoot = Join-Path $codexRoot 'skills'
$installer = Join-Path $skillRoot '.system/skill-installer/scripts/install-skill-from-github.py'

if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
  throw "Codex thiếu skill-installer: $installer"
}
Get-Command python -ErrorAction Stop | Out-Null

& (Join-Path $PSScriptRoot 'install.ps1') -Target Codex

$external = @(
  [pscustomobject]@{
    Name = 'security-best-practices'
    Repo = 'openai/skills'
    Path = 'skills/.curated/security-best-practices'
    Ref = '49f948faa9258a0c61caceaf225e179651397431'
  },
  [pscustomobject]@{
    Name = 'security-threat-model'
    Repo = 'openai/skills'
    Path = 'skills/.curated/security-threat-model'
    Ref = '49f948faa9258a0c61caceaf225e179651397431'
  },
  [pscustomobject]@{
    Name = 'stripe-best-practices'
    Repo = 'stripe/ai'
    Path = 'skills/stripe-best-practices'
    Ref = 'd9c9287ae870688bb3703b50e59ef1dd3692ffcb'
  },
  [pscustomobject]@{
    Name = 'frontend-design'
    Repo = 'anthropics/claude-plugins-official'
    Path = 'plugins/frontend-design/skills/frontend-design'
    Ref = 'f8c5e7a1dcb71b10cb74586224b5401f3de5db28'
  },
  [pscustomobject]@{
    Name = 'verification-before-completion'
    Repo = 'obra/superpowers'
    Path = 'skills/verification-before-completion'
    Ref = '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b'
  }
)

foreach ($item in $external) {
  $destination = Join-Path $skillRoot $item.Name
  if (Test-Path -LiteralPath $destination) {
    Write-Output "Codex: $($item.Name) đã có; giữ bản hiện tại, xem diff trước khi nâng phiên bản."
    continue
  }

  & python $installer --repo $item.Repo --path $item.Path --ref $item.Ref --method download
  if ($LASTEXITCODE -ne 0) { throw "Cài $($item.Name) thất bại." }
}

# Skill Stripe nằm dưới thư mục con; mang theo giấy phép MIT của repo gốc.
$stripeLicense = Join-Path (Join-Path $skillRoot 'stripe-best-practices') 'LICENSE.txt'
if (-not (Test-Path -LiteralPath $stripeLicense)) {
  $stripeRef = 'd9c9287ae870688bb3703b50e59ef1dd3692ffcb'
  $licenseUrl = "https://raw.githubusercontent.com/stripe/ai/$stripeRef/LICENSE"
  Invoke-WebRequest -Uri $licenseUrl -OutFile $stripeLicense -UseBasicParsing
  Write-Output 'Codex: đã lưu giấy phép MIT của Stripe.'
}

# Skill Superpowers là một thư mục con của repo MIT.
$verificationLicense = Join-Path (Join-Path $skillRoot 'verification-before-completion') 'LICENSE.txt'
if (-not (Test-Path -LiteralPath $verificationLicense)) {
  $superpowersRef = '2ce8aa15d05bd57213e6f746f953aafb7ded7a8b'
  $licenseUrl = "https://raw.githubusercontent.com/obra/superpowers/$superpowersRef/LICENSE"
  Invoke-WebRequest -Uri $licenseUrl -OutFile $verificationLicense -UseBasicParsing
  Write-Output 'Codex: đã lưu giấy phép MIT của Superpowers.'
}
