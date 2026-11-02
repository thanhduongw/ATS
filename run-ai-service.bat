@echo off
:: Chay ai-service (Python FastAPI) o cong 8088.
::
:: - Chi mo o 127.0.0.1: ai-service tin cac header X-User-* do API Gateway gan vao,
::   neu mo ra mang LAN thi nguoi khac goi thang duoc ma khong can dang nhap.
:: - API key Gemini, AWS S3... nam trong ai-service\.env, ung dung tu doc file nay.
:: - Can PostgreSQL va RabbitMQ dang chay (start-infrastructure.bat) de worker cham diem nhan su kien.
setlocal

cd /d "%~dp0ai-service"
if errorlevel 1 goto no_dir

if not exist ".venv\Scripts\python.exe" goto no_venv
if not exist ".env" echo [CANH BAO] Khong thay ai-service\.env - thieu API key Gemini va AWS, AI se khong chay duoc.

".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8088
goto :eof

:no_dir
echo [LOI] Khong thay thu muc "%~dp0ai-service"
pause
exit /b 1

:no_venv
echo [LOI] Chua co moi truong ao ai-service\.venv. Tao bang cac lenh:
echo        cd ai-service
echo        python -m venv .venv
echo        .venv\Scripts\pip install -r requirements.txt
pause
exit /b 1
