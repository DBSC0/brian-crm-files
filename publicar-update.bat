@echo off
echo.
echo ========================================
echo    Brian CRM -- Publicar Actualizacion
echo ========================================
echo.

set /p MENSAJE="Descripcion del cambio: "

if "%MENSAJE%"=="" (
    echo.
    echo  Error: escribi una descripcion del cambio.
    echo.
    pause
    exit /b 1
)

:: Leer version actual
set /p VERSION_ACTUAL=<version.txt

:: Extraer fecha y secuencia de la version actual (formato: YYYY-MM-DD-NNN)
for /f "tokens=1-4 delims=-" %%a in ("%VERSION_ACTUAL%") do (
    set AÑO=%%a
    set MES=%%b
    set DIA=%%c
    set SEQ_ACTUAL=%%d
)
set FECHA_VERSION=%AÑO%-%MES%-%DIA%

:: Obtener fecha de hoy
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set HOY=%%a

:: Si la fecha cambio, resetear secuencia; si no, incrementar
if "%FECHA_VERSION%"=="%HOY%" (
    set /a SEQ=SEQ_ACTUAL+1
) else (
    set SEQ=1
)

:: Formatear secuencia como 3 digitos
if %SEQ% LSS 10  set SEQ_STR=00%SEQ%
if %SEQ% GEQ 10  set SEQ_STR=0%SEQ%
if %SEQ% GEQ 100 set SEQ_STR=%SEQ%

set VERSION_NUEVA=%HOY%-%SEQ_STR%

echo.
echo  Version anterior : %VERSION_ACTUAL%
echo  Version nueva    : %VERSION_NUEVA%
echo.

:: Escribir nueva version (sin salto de linea al final)
<nul set /p ="%VERSION_NUEVA%"> version.txt

:: Git
git add .
if errorlevel 1 (
    echo.
    echo  Error en git add. Asegurate de estar en un repositorio git.
    echo.
    pause
    exit /b 1
)

git commit -m "%MENSAJE%"
if errorlevel 1 (
    echo.
    echo  Error en git commit.
    echo.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo  Error en git push. Verifica tu conexion y permisos del repositorio.
    echo.
    pause
    exit /b 1
)

echo.
echo  Listo! El cliente recibira la actualizacion
echo  la proxima vez que abra la app.
echo.
pause
