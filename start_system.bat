@echo off
title Mirjas HR System
cd "C:\Users\a.awwad\.gemini\antigravity\mirjas-hr"

:loop
echo Starting System...
npm run dev
echo.
echo System stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
