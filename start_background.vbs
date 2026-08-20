Set WshShell = CreateObject("WScript.Shell")

' Run WhatsApp bot in background
WshShell.Run chr(34) & "C:\Users\a.awwad\.gemini\antigravity\mirjas-hr\whatsapp-server\run_bot.bat" & Chr(34), 0

' Run Vite System in background
WshShell.Run chr(34) & "C:\Users\a.awwad\.gemini\antigravity\mirjas-hr\start_system.bat" & Chr(34), 0

Set WshShell = Nothing
