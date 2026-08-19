@echo off
echo ====================================================
echo   ATS - APPLICANT TRACKING SYSTEM
echo   Starting All Services
echo ====================================================

echo [1/3] Starting Docker Infrastructure...
docker compose up -d postgres rabbitmq redis

if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Docker is not running. Please launch Docker Desktop!
    pause
)

echo.
echo [2/3] Starting Backend Services...
call "%~dp0start-backend.bat"

echo.
echo [3/3] Starting Frontend SPA...
start "ATS - Frontend SPA (5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ====================================================
echo   System startup triggered:
echo   - Frontend:    http://localhost:5173
echo   - API Gateway: http://localhost:8080
echo   - RabbitMQ:    http://localhost:15672 (ats_user/ats_password)
echo ====================================================
