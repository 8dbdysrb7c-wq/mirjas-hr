@echo off
title Mirjas HR System
cd /d "%~dp0"

:loop
echo Starting System...
where npm >nul 2>nul
if %errorlevel% equ 0 (
  call npm run dev -- --host 127.0.0.1 --port 5173
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173
  ) else (
    node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173
  )
)
echo.
echo System stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
