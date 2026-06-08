# WinDiag AI Agent (Currently In Development)

A locally-hosted, AI-powered Windows system telemetry and diagnostic platform built with Python, FastAPI, and Vanilla JS. WinDiag runs silently in the background on every boot, collects hardware metrics and Windows Event Log data, and serves everything through a REST API to a live dashboard — with Google Gemini AI generating plain-language root cause analysis for kernel failures and system crashes.

> Built as a personal infrastructure project to bridge real-world IT support experience with backend software engineering. Every event this tool monitors (Kernel 41 power failures, display driver crashes, thermal throttling) was encountered and diagnosed manually before being automated here.

---

<!-- Replace the line below with a screenshot or GIF of your dashboard -->
### Live Hardware Telemetry & System Specs
<img src="https://raw.githubusercontent.com/TaseenAriq06/WinDiag-AI-Agent/main/assets/dashboard_telemetry3.jpg" width="100%"/>

<p align="center">
  <img src="https://raw.githubusercontent.com/TaseenAriq06/WinDiag-AI-Agent/main/assets/event_log_2.jpg" width="100%"/>
  &nbsp; 
</p>
---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Automated Startup](#automated-startup)
- [API Reference](#api-reference)
- [Monitored Windows Events](#monitored-windows-events)
- [Known Limitations](#known-limitations)

---

## Features

- **Live Hardware Telemetry** — Real-time CPU, RAM, GPU, and network utilization tracked every 15 seconds and rendered as a live Chart.js line graph
- **Windows Event Log Parsing** — Reads System event logs via `wevtutil`, filters for critical Event IDs (Kernel 41, BSODs, driver crashes, thermal events), and deduplicates entries before persisting to SQLite
- **AI-Powered Diagnostics** — Click any event log entry to request a deep root cause analysis from Gemini 2.5 Flash, structured as severity classification, cause explanation, and a step-by-step action plan
- **Smart AI Caching** — Gemini responses are cached in `localStorage` so repeated lookups for the same event ID load instantly without burning API quota
- **Process & Socket Monitor** — Top 5 memory-consuming processes and active TCP/IP connections displayed alongside hardware metrics
- **Searchable & Filterable Event Log** — Filter by severity (high/medium/low), search across event title, provider, and ID, and sort any column
- **CSV Export** — Export the currently filtered event log to a timestamped `.csv` file for offline review or incident reporting
- **Live Uptime Counter** — System uptime displayed as a live `Xd Xh Xm Xs` counter that ticks every second
- **Silent Background Agent** — Runs on Windows startup without a terminal window using a VBScript launcher and Windows Task Scheduler
<p align="center">
  <img src="https://raw.githubusercontent.com/TaseenAriq06/WinDiag-AI-Agent/main/assets/ai-modal-3.jpg" width="100%"/>
  </p>
---

## Architecture

```
				┌─────────────────────────────────────────────────────────┐
				│                    Windows Startup                      │
				│              silent_runner.vbs (invisible)              │
				└───────────────────────┬─────────────────────────────────┘
				                        │
				                        ▼
				┌──────────────────────────────────────────────────────────┐
				│                   start_all.bat                          │
				│  ┌─────────────────┐     ┌───────────────────────────┐   │
				│  │   agent.py      │     │  uvicorn api:app          │   │
				│  │                 │     │  (port 8000, background)  │   │
				│  │ - psutil        │     └───────────────────────────┘   │
				│  │ - wevtutil      │                                     │
				│  │ - SQLite writes │                                     │
				│  └────────┬────────┘                                     │
				└───────────┼──────────────────────────────────────────────┘
				            │
				            ▼
				┌─────────────────────┐        ┌───────────────────────────┐
				│   diagnostic.db     │◄──────►│   api.py (FastAPI)        │
				│   (SQLite)          │        │                           │
				│                     │        │  GET /api/telemetry       │
				│  - telemetry table  │        │  GET /api/errors          │
				│  - system_events    │        │  GET /api/live            │
				│    table            │        │  GET /api/system-specs    │
				└─────────────────────┘        │  POST /api/analyze-error  │
				                               └──────────────┬────────────┘
												 			  │
												┌─────────────▼─────────────┐
												│    Google Gemini API      │
												│    (gemini-2.5-flash)     │
												└──────────────┬────────────┘
												               │
												┌──────────────▼─────────────┐
												│    index.html              │
												│    (Dashboard Frontend)    │
												│                            │
												│   - Chart.js telemetry     │
												│   - Event log table        │
												│   - AI modal panel         │
												│   - Process/socket view    │
												└────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Agent** | Python 3.12, psutil | Hardware metric collection, battery/power state |
| **Event Parsing** | PowerShell (`Get-WinEvent`), csv | Windows Event Log extraction and clean native description rendering |
| **Database** | SQLite (stdlib `sqlite3`) | Persistent storage of telemetry and event records |
| **API** | FastAPI, Uvicorn | REST API server exposing telemetry and diagnostic endpoints |
| **AI** | Google Gemini 2.5 Flash (`google-genai`) | Natural language root cause analysis for system events |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) | Live dashboard, charts, modal UI |
| **Charting** | Chart.js | Real-time multi-axis line graph |
| **Markdown** | Marked.js | Renders structured Gemini AI responses in the modal |
| **Launcher** | VBScript, Windows Batch | Silent background startup on login |

---

## Project Structure

```
WinDiag-AI-Agent/
│
├── agent.py              # Data collection agent — runs on startup, writes to SQLite
├── api.py                # FastAPI backend — serves all REST endpoints
├── index.html            # Frontend dashboard — opens in browser
│
├── start_all.bat         # Batch launcher — starts agent + uvicorn server
├── silent_runner.vbs     # VBScript wrapper — runs start_all.bat invisibly
│
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variable template
├── .gitignore            # Excludes .env, venv, diagnostic.db
│
└── diagnostic.db         # Auto-generated SQLite database (gitignored)
```

---

## Prerequisites

- **OS:** Windows 10 or Windows 11 (required — uses Windows-only APIs)
- **Python:** 3.12.x ([download](https://www.python.org/downloads/release/python-3120/))
  - Python 3.13+ is not supported due to library compatibility
- **Google Gemini API Key** — free tier available at [Google AI Studio](https://aistudio.google.com)
- **Administrator privileges** recommended for full Event Log access

---

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/TaseenAriq06/WinDiag-AI-Agent.git
cd WinDiag-AI-Agent
```

**2. Create a virtual environment using Python 3.12**

```bash
py -3.12 -m venv venv
.\venv\Scripts\activate
```

You should see `(venv)` appear at the start of your terminal prompt.

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

---

## Configuration

**1. Create your `.env` file**

Copy the example file and fill in your API key:

```bash
copy .env.example .env
```

Open `.env` and set your key:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```


**2. Set the environment variable for your session**

In PowerShell before running:

```powershell
$env:GEMINI_API_KEY="your_key_here"
```

Or set it permanently in Windows → System Properties → Environment Variables so it persists across reboots.

---

## Running the Project

**Option A — Manual (development)**

Open two terminals with your venv activated:

Terminal 1 — run the data collection agent:
```bash
python agent.py
```

Terminal 2 — start the API server:
```bash
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

Then open `index.html` directly in your browser. The dashboard will connect to `http://127.0.0.1:8000` automatically.

**Option B — Single launcher (recommended)**

Double-click `start_all.bat`. This runs the agent once and starts the API server in the background. Then open `index.html` in your browser.

---

## Automated Startup

To have WinDiag launch silently every time you log into Windows:

1. Update the paths in `silent_runner.vbs` and `start_all.bat` to match your local install directory
2. Press `Win + R`, type `shell:startup`, and press Enter
3. Copy `silent_runner.vbs` into the Startup folder that opens
4. On next login, the agent and API server will start automatically with no terminal window

To verify it's running after startup, open your browser and navigate to:
```
http://127.0.0.1:8000
```
You should see: `{"message": "Diagnostic API Server is Online"}`

---

## API Reference

All endpoints are served at `http://127.0.0.1:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check — confirms server is online |
| `GET` | `/api/telemetry` | Last 100 telemetry records from SQLite |
| `GET` | `/api/errors` | Critical system events from the last 30 days, translated with severity and action |
| `GET` | `/api/live` | Current CPU, RAM, GPU %, network Mbps, top processes, active sockets |
| `GET` | `/api/system-specs` | OS, CPU, GPU, RAM, disk, core count, boot time |
| `POST` | `/api/analyze-error` | Sends event data to Gemini and returns a structured diagnostic report |
| `GET` | `/api/health-summary` | Requests a 24-hour summary report of average/highest CPU and RAM usages |

**Example — `/api/analyze-error` request body:**
```json
{
  "event_id": 41,
  "title": "Kernel-Power Failure",
  "provider": "Microsoft-Windows-Kernel-Power",
  "description": "The system rebooted without cleanly shutting down first."
}
```
---

## Monitored Windows Events

| Event ID | Classification | Severity |
|---|---|---|
| 41 | Kernel-Power Failure | 🔴 High |
| 1001 | BugCheck (Blue Screen / BSOD) | 🔴 High |
| 88 | Thermal Throttling | 🔴 High |
| 4101 | Display Driver Crash (TDR) | 🟠 Medium |
| 18 | WHEA-Logger Hardware Error | 🟠 Medium |
| 7011 | Service Control Manager Timeout | 🟠 Medium |
| 10317 | Network Adapter (NDIS) Error | 🟡 Low |
| 10010 | DCOM Server Timeout | 🟡 Low |
| 6005 | System Startup (Event Log Start) | 🟡 Low |

---

## Known Limitations

- **Windows only** — `wevtutil`, `win32evtlog`, and PowerShell GPU counters are Windows-specific APIs. This project will not run on macOS or Linux.
- **Admin privileges** — Some Event Log entries and network socket data may be hidden without running as Administrator.
- **GPU monitoring** — GPU utilization is read via PowerShell's `Get-Counter` and reflects only the DirectX 3D engine. Compute or video decode workloads may show 0%.
- **Single-user local tool** — The API is bound to `127.0.0.1` by design. This is not intended for network or multi-machine deployment.
- **Python 3.12 required** — Python 3.13+ breaks compatibility with `pywin32` and `psutil` wheel builds as of this project's development.
