@echo off
echo Iniciando Cloudflare Tunnel...
echo La URL publica aparecera en pantalla en unos segundos.
echo Compartila con el cliente. Cerrá esta ventana para terminar el tunnel.
echo.
cloudflared tunnel --url http://localhost:8888
pause
