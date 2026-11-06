param(
  [string]$Destination = ""
)

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workspace = (Resolve-Path -LiteralPath (Join-Path $project '..')).Path
$stagingRoot = Join-Path $workspace '.codex-tmp'
$stage = Join-Path $stagingRoot ('gop-portable-' + [guid]::NewGuid().ToString('N'))
$bundleName = 'GOP_PORTABLE_' + (Get-Date -Format 'yyyy-MM-dd')
$bundle = Join-Path $stage $bundleName
$web = Join-Path $bundle 'crowdfunding-ai-platform'

if (-not $Destination) {
  $Destination = Join-Path $workspace ($bundleName + '.zip')
}
$zip = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $zip) { throw "File ZIP đã tồn tại: $zip" }

$resolvedRoot = [IO.Path]::GetFullPath($stagingRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$resolvedStage = [IO.Path]::GetFullPath($stage)
if (-not $resolvedStage.StartsWith(($resolvedRoot + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Thư mục tạm nằm ngoài vùng đóng gói.'
}

function Copy-Folder([string]$Source, [string]$Target) {
  if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw "Thiếu thư mục: $Source" }
  Copy-Item -LiteralPath $Source -Destination $Target -Recurse
}

try {
  New-Item -ItemType Directory -Force -Path $web | Out-Null
  foreach ($name in @('src', 'public', 'docs', 'database', 'scripts')) {
    Copy-Folder (Join-Path $project $name) (Join-Path $web $name)
  }
  foreach ($name in @('.env.example', '.gitignore', 'CHAY-WEB.bat', 'README.md', 'eslint.config.mjs',
      'next-env.d.ts', 'next.config.ts', 'package.json', 'pnpm-lock.yaml',
      'pnpm-workspace.yaml', 'postcss.config.mjs', 'tsconfig.json')) {
    Copy-Item -LiteralPath (Join-Path $project $name) -Destination (Join-Path $web $name)
  }

  $dbTarget = Join-Path $web '.local-data/gop-mock.sqlite'
  & node (Join-Path $project 'scripts/snapshot-local-db.mjs') $dbTarget
  if ($LASTEXITCODE -ne 0) { throw 'Không chụp được SQLite local.' }

  $weekSource = Join-Path $workspace 'BAI_NOP_TUAN_USE_CASE_ERD_DATABASE'
  $weekTarget = Join-Path $bundle 'BAI_NOP_TUAN_USE_CASE_ERD_DATABASE'
  New-Item -ItemType Directory -Force -Path $weekTarget | Out-Null
  foreach ($name in @('00_CAY_THAM_CHIEU', '01_USE_CASE', '02_ERD_DATABASE', '03_NGUON_PLANTUML')) {
    Copy-Folder (Join-Path $weekSource $name) (Join-Path $weekTarget $name)
  }
  foreach ($name in @('README.md', 'KIEM_TRA_PHAM_VI.md')) {
    Copy-Item -LiteralPath (Join-Path $weekSource $name) -Destination (Join-Path $weekTarget $name)
  }
  Copy-Item -LiteralPath (Join-Path $weekSource '02_ERD_DATABASE.zip') -Destination (Join-Path $weekTarget '02_ERD_DATABASE.zip')

  $guideSource = Join-Path $workspace 'TAI_LIEU_HUONG_DAN_UI_UX_GOP'
  $guideTarget = Join-Path $bundle 'TAI_LIEU_HUONG_DAN_UI_UX_GOP'
  New-Item -ItemType Directory -Force -Path $guideTarget | Out-Null
  foreach ($name in @('images', 'QUY_TRINH_NHANH')) {
    Copy-Folder (Join-Path $guideSource $name) (Join-Path $guideTarget $name)
  }
  foreach ($name in @('README.md', 'HUONG_DAN_SU_DUNG_GOP_CHI_TIET.docx',
      'HUONG_DAN_SU_DUNG_GOP_CHI_TIET.md', 'HUONG_DAN_SU_DUNG_GOP.docx',
      'HUONG_DAN_SU_DUNG_GOP.md', 'HUONG_DAN_UI_UX_VA_CHUC_NANG_GOP.docx',
      'build_ui_ux_guide.py', 'build_user_manual.py')) {
    Copy-Item -LiteralPath (Join-Path $guideSource $name) -Destination (Join-Path $guideTarget $name)
  }

  $assignmentTarget = Join-Path $bundle 'tai-lieu-de-bai'
  New-Item -ItemType Directory -Force -Path $assignmentTarget | Out-Null
  foreach ($name in @('ĐỀ TÀI - BẢN CẬP NHẬT.docx', 'ĐỀ TÀI.docx',
      'tong_hop_yeu_cau_de_tai.md', 'transcript_bandicam_2026-08-28_16-12-24.md',
      'transcript_bandicam_2026-08-28_16-22-26.md', '_detai_extract.md')) {
    Copy-Item -LiteralPath (Join-Path $workspace $name) -Destination (Join-Path $assignmentTarget $name)
  }
  $recordingsTarget = Join-Path $assignmentTarget 'video-goc'
  New-Item -ItemType Directory -Force -Path $recordingsTarget | Out-Null
  foreach ($name in @('bandicam 2026-08-28 16-12-24-625.mp4',
      'bandicam 2026-08-28 16-22-26-880.mp4')) {
    Copy-Item -LiteralPath (Join-Path $workspace $name) -Destination (Join-Path $recordingsTarget $name)
  }

  Copy-Item -LiteralPath (Join-Path $project 'docs/CHUYEN_MAY_KHAC.md') -Destination (Join-Path $bundle 'DOC_TRUOC_KHI_CHAY.md')
  @'
# Nội dung gói Góp

- `crowdfunding-ai-platform`: source web, tài nguyên, tài liệu, video demo và script chạy.
- `crowdfunding-ai-platform/.local-data/gop-mock.sqlite`: bản chụp nhất quán của database local chính, đã gộp dữ liệu WAL.
- `BAI_NOP_TUAN_USE_CASE_ERD_DATABASE`: Use Case, ERD, SQL, ảnh và file chỉnh sửa sơ đồ.
- `TAI_LIEU_HUONG_DAN_UI_UX_GOP`: hướng dẫn sử dụng, ảnh minh họa và quy trình nhanh.
- `tai-lieu-de-bai`: hai bản Word, bản tổng hợp, transcript và video gốc của đề tài.
- `DOC_TRUOC_KHI_CHAY.md`: hướng dẫn mở trên máy khác và giới hạn của demo.

Các ZIP cũ, node_modules, .next, file môi trường thật, cache, dữ liệu SQLite thử nghiệm và bản render trung gian không nằm trong gói. Giải nén toàn bộ trước khi chạy `crowdfunding-ai-platform/CHAY-WEB.bat`.
'@ | Set-Content -LiteralPath (Join-Path $bundle 'NOI_DUNG_GOI.md') -Encoding UTF8
  Compress-Archive -LiteralPath $bundle -DestinationPath $zip -CompressionLevel Optimal

  Add-Type -AssemblyName System.IO.Compression
  $archive = [IO.Compression.ZipFile]::OpenRead($zip)
  try {
    # Windows PowerShell ghi dấu \ trong ZIP; so đường dẫn sau khi đổi về /.
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($required in @(
        "$bundleName/DOC_TRUOC_KHI_CHAY.md",
        "$bundleName/NOI_DUNG_GOI.md",
        "$bundleName/crowdfunding-ai-platform/package.json",
        "$bundleName/crowdfunding-ai-platform/CHAY-WEB.bat",
        "$bundleName/crowdfunding-ai-platform/.local-data/gop-mock.sqlite",
        "$bundleName/BAI_NOP_TUAN_USE_CASE_ERD_DATABASE/01_USE_CASE/",
        "$bundleName/BAI_NOP_TUAN_USE_CASE_ERD_DATABASE/02_ERD_DATABASE.zip",
        "$bundleName/TAI_LIEU_HUONG_DAN_UI_UX_GOP/HUONG_DAN_SU_DUNG_GOP_CHI_TIET.docx",
        "$bundleName/tai-lieu-de-bai/video-goc/bandicam 2026-08-28 16-12-24-625.mp4",
        "$bundleName/tai-lieu-de-bai/video-goc/bandicam 2026-08-28 16-22-26-880.mp4"
      )) {
      if (-not ($names | Where-Object { $_ -eq $required -or $_.StartsWith($required) })) {
        throw "ZIP thiếu phần bắt buộc: $required"
      }
    }
    $unwanted = @($names | Where-Object { $_ -match '(^|/)(node_modules|\.next|output|_rendered[^/]*|\.git|\.env\.local)(/|$)' })
    if ($unwanted.Count) { throw "ZIP có file tạm không mong muốn: $($unwanted[0])" }
    Write-Output "ZIP: $zip"
    Write-Output "Số mục: $($names.Count)"
    Write-Output "Dung lượng: $([Math]::Round((Get-Item -LiteralPath $zip).Length / 1MB, 1)) MB"
  } finally {
    $archive.Dispose()
  }
} finally {
  if (Test-Path -LiteralPath $resolvedStage) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}
