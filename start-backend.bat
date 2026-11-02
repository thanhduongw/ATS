@echo off
:: Ép múi giờ chuẩn cho tất cả các cửa sổ CMD được gọi từ script này
set JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh

echo ====================================================
echo   ATS - Starting 10 Backend Microservices + AI Service
echo ====================================================

echo [1/11] Starting API Gateway (Port 8080)...
start "ATS - API Gateway (8080)" cmd /k ""%~dp0run-service.bat" api-gateway"
ping -n 5 127.0.0.1 > nul

echo [2/11] Starting Auth Service (Port 8081)...
start "ATS - Auth Service (8081)" cmd /k ""%~dp0run-service.bat" auth-service"
ping -n 5 127.0.0.1 > nul

echo [3/11] Starting MasterData Service (Port 8082)...
start "ATS - MasterData Service (8082)" cmd /k ""%~dp0run-service.bat" masterdata-service"
ping -n 3 127.0.0.1 > nul

echo [4/11] Starting Recruitment Service (Port 8083)...
start "ATS - Recruitment Service (8083)" cmd /k ""%~dp0run-service.bat" recruitment-service"
ping -n 3 127.0.0.1 > nul

echo [5/11] Starting Candidate Service (Port 8084)...
start "ATS - Candidate Service (8084)" cmd /k ""%~dp0run-service.bat" candidate-service"
ping -n 3 127.0.0.1 > nul

echo [6/11] Starting Interview Service (Port 8085)...
start "ATS - Interview Service (8085)" cmd /k ""%~dp0run-service.bat" interview-service"
ping -n 3 127.0.0.1 > nul

echo [7/11] Starting Notification Service (Port 8086)...
start "ATS - Notification Service (8086)" cmd /k ""%~dp0run-service.bat" notification-service"
ping -n 3 127.0.0.1 > nul

echo [8/11] Starting Dashboard Service (Port 8087)...
start "ATS - Dashboard Service (8087)" cmd /k ""%~dp0run-service.bat" dashboard-service"
ping -n 3 127.0.0.1 > nul

echo [9/11] Starting Application Service (Port 8089)...
start "ATS - Application Service (8089)" cmd /k ""%~dp0run-service.bat" application-service"
ping -n 3 127.0.0.1 > nul

echo [10/11] Starting Offer Service (Port 8090)...
start "ATS - Offer Service (8090)" cmd /k ""%~dp0run-service.bat" offer-service"
ping -n 3 127.0.0.1 > nul

echo [11/11] Starting AI Service (Port 8088, chi 127.0.0.1)...
start "ATS - AI Service (8088)" cmd /k ""%~dp0run-ai-service.bat""

echo ====================================================
echo   All 10 Backend Microservices + AI Service are starting up!
echo   API Gateway: http://localhost:8080
echo ====================================================