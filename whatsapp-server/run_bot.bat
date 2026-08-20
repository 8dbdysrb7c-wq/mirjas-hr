@echo off
title WhatsApp Bot Server
cd "C:\Users\a.awwad\.gemini\antigravity\mirjas-hr\whatsapp-server"

set WAHA_API_KEY=61b2ccb1b88849c2adfa27c4947478ef
set WAHA_URL=http://127.0.0.1:3000

:loop
echo Starting WhatsApp Bot...
node server.js
echo.
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
