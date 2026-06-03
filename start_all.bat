@echo off
:: Dynamically set the directory to wherever this .bat file is located
cd /d "%~dp0"

echo Starting WinDiag V2 Daemons at %date% %time% > agent_log.txt

:: Start the data collection agent in the background (Async)
start /B "" ".\venv\Scripts\python.exe" agent.py >> agent_log.txt 2>&1

:: Start the FastAPI server in the background (Async)
start /B "" ".\venv\Scripts\python.exe" -m uvicorn api:app --host 127.0.0.1 --port 8000