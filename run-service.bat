@echo off
:: Chay mot microservice, co nap file .env cua chinh no truoc.
::
:: VI SAO CAN FILE NAY: Spring Boot KHONG tu doc file .env. No chi doc bien moi truong that,
:: application.yml, va cac nguon cau hinh cua Spring. Cac service duoc khoi dong bang
:: "mvnw spring-boot:run" nen MAIL_USERNAME / MAIL_PASSWORD / AWS_* trong .env khong bao gio
:: den duoc ung dung -> gui mail that bai am tham, upload CV that bai am tham.
::
:: Dung: run-service.bat <ten-thu-muc-service>
setlocal EnableExtensions

set "SVC=%~1"
if "%SVC%"=="" (
    echo [LOI] Thieu ten service. Vi du: run-service.bat auth-service
    pause
    exit /b 1
)

cd /d "%~dp0%SVC%" || (
    echo [LOI] Khong thay thu muc "%~dp0%SVC%"
    pause
    exit /b 1
)

if exist ".env" (
    echo [.env] Dang nap bien moi truong cho %SVC%...
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        if not "%%~A"=="" (
            set "%%~A=%%~B"
            echo        %%~A = ^<da dat^>
        )
    )
) else (
    echo [.env] %SVC% khong co file .env, bo qua.
)

call "%~dp0%SVC%\mvnw.cmd" spring-boot:run
