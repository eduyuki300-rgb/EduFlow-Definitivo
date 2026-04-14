@echo off
title Servidor EduFlow
color 0D
echo =========================================
echo       Iniciando o Sistema EduFlow...
echo =========================================
echo.
cd /d "%~dp0"

echo [1/3] Fechando servidores antigos (se existirem)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [2/3] Abrindo o navegador local...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo [3/3] Iniciando o servidor...
call npm run dev
pause
