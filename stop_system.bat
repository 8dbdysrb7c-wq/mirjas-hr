@echo off
title Stop System
echo Stopping System and WhatsApp Bot...
taskkill /F /IM node.exe
taskkill /F /IM wscript.exe
taskkill /F /IM cmd.exe
echo Done.
pause
