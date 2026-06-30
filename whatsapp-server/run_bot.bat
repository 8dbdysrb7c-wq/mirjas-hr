@echo off
title WhatsApp Bot Server
cd "C:\Users\a.awwad\.gemini\antigravity\mirjas-hr\whatsapp-server"

:loop
echo Starting WhatsApp Bot...
node server.js
echo.
echo Bot crashed or stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
