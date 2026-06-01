# WinDiag AI Agent
A locally-hosted, AI-powered system telemetry and diagnostic agent built with Python, FastAPI, and Vanilla JS. 

### Key Features
- **Real-time Telemetry:** Tracks CPU, RAM, GPU, and Network usage with Chart.js.
- **AI Diagnostics:** Integrates Gemini AI to provide plain-language root cause analysis for system crashes.
- **Process & Network Monitoring:** Visualizes top resource-consuming processes and active TCP/IP network sockets.
- **Data Persistence:** SQLite-backed logging of system events with CSV export capabilities.
- **Enterprise Deployment:** Background daemon architecture via Windows Task Scheduler.

### Documentation
[Insert a GIF of your dashboard here!]

### Tech Stack
- **Backend:** Python, FastAPI, Uvicorn, psutil, SQLite.
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Chart.js, Marked.js.
- **Integrations:** Google Gemini API for diagnostic logic.

### Getting Started
1. Clone the repo: `git clone [URL]`
2. Setup environment: Create a `.env` file with your `GEMINI_API_KEY`.
3. Run: Execute `silent_runner.vbs` to start the backend.
