Set objFSO = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Dynamically get the exact folder where this VBScript lives
currentPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentPath

' Run the batch file silently using the dynamic path
WshShell.Run chr(34) & currentPath & "\start_all.bat" & Chr(34), 0

Set WshShell = Nothing
Set objFSO = Nothing