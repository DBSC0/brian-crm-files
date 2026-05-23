@echo off
echo Cerrando servidor Brian CRM...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8888"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Servidor cerrado.
pause
