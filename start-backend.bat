@echo off
:: Ép múi giờ chuẩn cho tất cả các cửa sổ CMD được gọi từ script này
set JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh

echo ====================================================
echo   ATS - Starting 10 Backend Microservices
echo ====================================================

echo [1/10] Starting API Gateway (Port 8080)...
start "ATS - API Gateway (8080)" cmd /k "cd /d "%~dp0api-gateway" && mvnw.cmd spring-boot:run"
ping -n 5 127.0.0.1 > nul

echo [2/10] Starting Auth Service (Port 8081)...
start "ATS - Auth Service (8081)" cmd /k "cd /d "%~dp0auth-service" && mvnw.cmd spring-boot:run"
ping -n 5 127.0.0.1 > nul

echo [3/10] Starting MasterData Service (Port 8082)...
start "ATS - MasterData Service (8082)" cmd /k "cd /d "%~dp0masterdata-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [4/10] Starting Recruitment Service (Port 8083)...
start "ATS - Recruitment Service (8083)" cmd /k "cd /d "%~dp0recruitment-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [5/10] Starting Candidate Service (Port 8084)...
start "ATS - Candidate Service (8084)" cmd /k "cd /d "%~dp0candidate-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [6/10] Starting Interview Service (Port 8085)...
start "ATS - Interview Service (8085)" cmd /k "cd /d "%~dp0interview-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [7/10] Starting Notification Service (Port 8086)...
start "ATS - Notification Service (8086)" cmd /k "cd /d "%~dp0notification-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [8/10] Starting Dashboard Service (Port 8087)...
start "ATS - Dashboard Service (8087)" cmd /k "cd /d "%~dp0dashboard-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [9/10] Starting Application Service (Port 8089)...
start "ATS - Application Service (8089)" cmd /k "cd /d "%~dp0application-service" && mvnw.cmd spring-boot:run"
ping -n 3 127.0.0.1 > nul

echo [10/10] Starting Offer Service (Port 8090)...
start "ATS - Offer Service (8090)" cmd /k "cd /d "%~dp0offer-service" && mvnw.cmd spring-boot:run"

echo ====================================================
echo   All 10 Backend Microservices are starting up!
echo   API Gateway: http://localhost:8080
echo ====================================================