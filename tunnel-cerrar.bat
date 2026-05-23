@echo off
echo Cerrando Cloudflare Tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
echo Tunnel cerrado.
pause
