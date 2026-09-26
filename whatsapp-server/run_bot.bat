@echo off
title WhatsApp Bot Server
cd /d "%~dp0"

set WAHA_API_KEY=61b2ccb1b88849c2adfa27c4947478ef
set WAHA_URL=http://127.0.0.1:3000

:loop
echo Starting WhatsApp Bot...
where node >nul 2>nul
if %errorlevel% equ 0 (
  node server.js
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
  ) else (
    node server.js
  )
)
echo.
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
