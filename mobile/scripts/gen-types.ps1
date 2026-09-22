# Sinh type TypeScript từ OpenAPI của 9 service qua API Gateway.
# Dùng: npm run gen:types            (mặc định đọc IP từ mobile/.env)
#       npm run gen:types -- -Base http://192.168.0.111:8080
param([string]$Base = "")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# Không truyền -Base thì lấy IP từ .env để chỉ phải sửa IP ở đúng MỘT chỗ.
if ([string]::IsNullOrWhiteSpace($Base)) {
  $envFile = Join-Path $root ".env"
  if (-not (Test-Path $envFile)) {
    throw "Không thấy mobile/.env. Tạo theo mẫu .env.example, hoặc truyền -Base http://<IP>:8080"
  }
  $line = Select-String -Path $envFile -Pattern '^\s*EXPO_PUBLIC_API_BASE_URL\s*=\s*(.+)$' |
          Select-Object -First 1
  if (-not $line) { throw "Thiếu EXPO_PUBLIC_API_BASE_URL trong mobile/.env" }
  # .env chứa .../api — cắt phần /api vì mỗi service tự nối "/api/<svc>/v3/api-docs"
  $Base = $line.Matches[0].Groups[1].Value.Trim() -replace '/api/?$', ''
}
$Base = $Base.TrimEnd('/')

$svcs = @("auth","masterdata","recruitment","candidate","interview",
          "notification","dashboard","application","offer")

$outDir = Join-Path $root "src/types/generated"
New-Item -ItemType Directory -Force $outDir | Out-Null

Write-Host "Gateway: $Base" -ForegroundColor Cyan
$failed = @()
foreach ($s in $svcs) {
  $url = "$Base/api/$s/v3/api-docs"
  Write-Host "Sinh type cho $s-service... ($url)"
  npx openapi-typescript $url -o (Join-Path $outDir "$s.ts")
  if ($LASTEXITCODE -ne 0) { $failed += $s }
}

if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "THẤT BẠI: $($failed -join ', ')" -ForegroundColor Red
  Write-Host "Kiểm tra service tương ứng đã chạy chưa, và mở thử $Base/api/<svc>/v3/api-docs trên trình duyệt." -ForegroundColor Yellow
  exit 1
}
Write-Host "Xong: $($svcs.Count) file trong src/types/generated/" -ForegroundColor Green
