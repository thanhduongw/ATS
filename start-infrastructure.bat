@echo off
echo ====================================================
echo   ATS - Starting Infrastructure (Docker)
echo   PostgreSQL (5432), RabbitMQ (5672), Redis (6379)
echo ====================================================

docker compose up -d postgres rabbitmq redis

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker daemon is not running!
    echo Please start Docker Desktop first, then run this script again.
    pause
    exit /b 1
)

echo [SUCCESS] Middleware containers are running!
