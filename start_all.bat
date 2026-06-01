@echo off
:: Dynamically set the directory to wherever this .bat file is located
cd /d "%~dp0"

echo Agent + API started at %date% %time% > agent_log.txt

:: Run the data collection agent once
".\venv\Scripts\python.exe" agent.py >> agent_log.txt 2>&1

:: Start the FastAPI server (keeps running in background)
start "DiagnosticAPI" ".\venv\Scripts\python.exe" -m uvicorn api:app --host 127.0.0.1 --port 8000