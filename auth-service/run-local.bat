@echo off
setlocal

for /f "usebackq tokens=1,* delims==" %%A in (`findstr /v "^#" .env`) do (
    set "%%A=%%B"
)

set JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh

mvnw.cmd spring-boot:run
