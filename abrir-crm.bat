@echo off
echo Iniciando Brian CRM en http://localhost:8888 ...
start "" http://localhost:8888/
start "BrianCRM-Server" cmd /c "cd /d "%~dp0" && npx serve . -l 8888"
