# ====================================================
#   ATS - Applicant Tracking System Startup Script
# ====================================================

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       ATS - KHỞI ĐỘNG TOÀN BỘ HỆ THỐNG             " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Start Docker
Write-Host "`n[Bước 1/3] Khởi động hạ tầng Docker (Postgres, RabbitMQ, Redis)..." -ForegroundColor Yellow
docker compose up -d postgres rabbitmq redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "[CẢNH BÁO] Docker chưa bật. Vui lòng mở ứng dụng Docker Desktop trên Windows!" -ForegroundColor Red
} else {
    Write-Host "[OK] Hạ tầng Docker đã sẵn sàng." -ForegroundColor Green
}

# 2. Start Backend Services
Write-Host "`n[Bước 2/3] Khởi động 10 Backend Microservices (1 Gateway + 9 Services)..." -ForegroundColor Yellow

$services = @(
    @{ Name = "API Gateway"; Port = 8080; Dir = "api-gateway" },
    @{ Name = "Auth Service"; Port = 8081; Dir = "auth-service" },
    @{ Name = "MasterData Service"; Port = 8082; Dir = "masterdata-service" },
    @{ Name = "Recruitment Service"; Port = 8083; Dir = "recruitment-service" },
    @{ Name = "Candidate Service"; Port = 8084; Dir = "candidate-service" },
    @{ Name = "Interview Service"; Port = 8085; Dir = "interview-service" },
    @{ Name = "Notification Service"; Port = 8086; Dir = "notification-service" },
    @{ Name = "Dashboard Service"; Port = 8087; Dir = "dashboard-service" },
    @{ Name = "Application Service"; Port = 8089; Dir = "application-service" },
    @{ Name = "Offer Service"; Port = 8090; Dir = "offer-service" }
)

foreach ($s in $services) {
    Write-Host "  -> Khởi động $($s.Name) (Port $($s.Port))..." -ForegroundColor DarkCyan
    Start-Process cmd.exe -ArgumentList "/k cd /d ""$PSScriptRoot\$($s.Dir)"" && mvnw.cmd spring-boot:run"
    Start-Sleep -Seconds 2
}

# 3. Start Frontend
Write-Host "`n[Bước 3/3] Khởi động Frontend React..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k cd /d ""$PSScriptRoot\frontend"" && npm run dev"

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  HỆ THỐNG ĐÃ ĐƯỢC KHỞI ĐỘNG!" -ForegroundColor Green
Write-Host "  - Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  - API Gateway: http://localhost:8080" -ForegroundColor White
Write-Host "  - RabbitMQ:    http://localhost:15672 (ats_user / ats_password)" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Cyan
