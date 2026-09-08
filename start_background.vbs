Set WshShell = CreateObject("WScript.Shell")
Set FileSystem = CreateObject("Scripting.FileSystemObject")
ProjectDir = FileSystem.GetParentFolderName(WScript.ScriptFullName)

' Run WhatsApp bot in background
WshShell.Run chr(34) & FileSystem.BuildPath(ProjectDir, "whatsapp-server\run_bot.bat") & Chr(34), 0

' Run Vite System in background
WshShell.Run chr(34) & FileSystem.BuildPath(ProjectDir, "start_system.bat") & Chr(34), 0

Set WshShell = Nothing
Set FileSystem = Nothing
