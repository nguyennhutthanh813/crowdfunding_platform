# Đẩy CSDL lên Supabase và gắn DATABASE_URL cho backend trên Vercel.
# Chạy từ thư mục gốc repo:  powershell -ExecutionPolicy Bypass -File scripts\setup-supabase.ps1
# Mọi giá trị nhạy cảm đều nhập ẩn, không in ra màn hình, không commit.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Read-Secret($label) {
  $s = Read-Host $label -AsSecureString
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

Write-Host "Lấy chuỗi kết nối: Supabase > Project > Connect > Session pooler (postgresql://...)"
$dbUrl = Read-Secret "DATABASE_URL"
if ($dbUrl -notmatch '^postgres(ql)?://') { throw "DATABASE_URL phải bắt đầu bằng postgresql://" }

# 1. Ghi vào backend/.env (file đã gitignore)
$envFile = "backend\.env"
$lines = if (Test-Path $envFile) { Get-Content $envFile } else { @() }
if ($lines -match '^DATABASE_URL=') { $lines = $lines -replace '^DATABASE_URL=.*$', "DATABASE_URL=$dbUrl" } else { $lines += "DATABASE_URL=$dbUrl" }
Set-Content $envFile $lines

# 2. Tạo bảng + nạp dữ liệu mẫu lên Supabase
corepack pnpm db:sync-supabase
if ($LASTEXITCODE -ne 0) { throw "Đồng bộ Supabase thất bại, kiểm tra lại DATABASE_URL" }

# 3. Gắn DATABASE_URL cho project backend trên Vercel
$token = Read-Secret "VERCEL_TOKEN (Enter để bỏ qua bước này)"
if ($token) {
  $h = @{ Authorization = "Bearer $token" }
  $team = (Invoke-RestMethod "https://api.vercel.com/v2/user" -Headers $h).user.defaultTeamId
  $body = @{ key = "DATABASE_URL"; value = $dbUrl; type = "encrypted"; target = @("production","preview","development") } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/fundviet-backend/env?teamId=$team&upsert=true" -Headers $h -ContentType "application/json" -Body $body | Out-Null
  Write-Host "Đã gắn DATABASE_URL vào Vercel (fundviet-backend)."
  git commit --allow-empty -m "Redeploy backend with Supabase database" | Out-Null
  git push origin main
}
Write-Host "Xong."
