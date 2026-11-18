# Khoi dong MOT service cua ATS o che do nen (cua so an), ghi log vao logs\<service>.log.
# Duoc goi tu scripts/dev/svc.sh; cung co the chay tay:
#   powershell -File scripts\dev\start-service.ps1 interview-service
param([Parameter(Mandatory = $true)][string]$Service)

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$log = Join-Path $logs "$Service.log"

if ($Service -eq "ai-service") {
    $bat = "`"$root\run-ai-service.bat`""
} else {
    $bat = "`"$root\run-service.bat`" $Service"
}

# Spring Boot khong tu dat mui gio: giong start-backend.bat.
$env:JAVA_TOOL_OPTIONS = "-Duser.timezone=Asia/Ho_Chi_Minh"

# cmd /c bo cap nhay ngoai cung khi chuoi bat dau bang dau nhay -> boc them mot cap nhay.
$cmdLine = "`"$bat > `"$log`" 2>&1 < NUL`""
Start-Process cmd -WindowStyle Hidden -WorkingDirectory $root -ArgumentList "/c", $cmdLine
