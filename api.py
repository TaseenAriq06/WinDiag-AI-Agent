import os
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import sqlite3
import platform
import psutil
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title = "Diagnostic Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Gemini Client failed to initialize. Error {e}")

# --- NEW: Global Variables for Wi-Fi Speed Calculation ---
last_net_bytes = psutil.net_io_counters().bytes_sent + psutil.net_io_counters().bytes_recv
last_net_time = time.time()

ERROR_DICTIONARY = {
    41: {
        "title": "Kernel-Power Failure",
        "description": "The system rebooted without cleanly shutting down first.",
        "action": "Check for thermal throttling, sudden power loss, or a failing power supply.",
        "severity": "high"
    },
    1001: {
        "title": "BugCheck (Blue Screen)",
        "description": "Windows encountered a fatal system error and dumped memory.",
        "action": "Check for recently installed driver updates or faulty RAM.",
        "severity": "high"
    },
    18: {
        "title": "WHEA-Logger Hardware Error",
        "description": "Windows cannot store Bluetooth authentication codes on the local adapter.",
        "action": "Run memory diagnostics and check CPU/GPU temperatures.",
        "severity": "medium"
    },
    4101: {
        "title": "Display Driver Crash",
        "description": "The graphics driver stopped responding and has successfully recovered.",
        "action": "Update GPU drivers and check for overclocking instability.",
        "severity": "medium"
    },
    88: {
        "title": "Thermal Throttling",
        "description": "The system detected an overheat condition and heavily reduced performance.",
        "action": "Clean laptop fans, ensure proper airflow, and check ambient room temperature.",
        "severity": "high"
    },
    10317: {
        "title": "Network Adapter (NDIS) Error",
        "description": "The Wi-Fi or Ethernet driver detected an internal error or failed a power transition.",
        "action": "Update network drivers or disable 'Allow the computer to turn off this device to save power'.",
        "severity": "low"
    },
    10010: {
        "title": "DCOM Server Timeout",
        "description": "A background Windows component failed to register in the required timeframe.",
        "action": "Usually harmless. If frequent, verify Windows system integrity using 'sfc /scannow'.",
        "severity": "low"
    },
    7011: {
        "title": "Service Control Manager Timeout",
        "description": "A Windows background service took too long to respond to a system request.",
        "action": "Check the specific provider name. You may need to reinstall the freezing application.",
        "severity": "medium"
    },
    6005: {
        "title": "System Startup",
        "description": "The Windows Event Log service was started, indicating a system boot.",
        "action": "Routine informational event. No action required.",
        "severity": "low"
    }
}

def fetch_data(query: str, params: tuple = (), limit: int = 100):
    """Connects to SQLite, runs a query, and formats the outputs cleanly."""
    conn = sqlite3.connect('diagnostic.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(f"{query} ORDER BY timestamp DESC LIMIT {limit}", params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]

@app.get("/")
def home():
    return {"message": "Diagnostic API Server is Online"}

@app.get("/api/telemetry")
def get_telemetry():
    data = fetch_data("SELECT * FROM telemetry")
    return {"count": len(data), "telemetry": data}

@app.get("/api/errors")
def get_errors():
    sql_query = "SELECT * FROM system_events WHERE timestamp >= datetime('now', '-30 days')"
    raw_data = fetch_data(sql_query, limit=1000)
    translated_errors = []
    
    for row in raw_data:
        event_id = row["event_id"]

        translation = ERROR_DICTIONARY.get(event_id, {
            "title": f"Unknown Event (ID: {event_id})",
            "description": "An undocumented critical system event was recorded.",
            "action": f"Investigate source provider: {row['provider']}"
        })

        translated_errors.append({
            "event_id": event_id,
            "timestamp": row["timestamp"],
            "provider": row["provider"],
            "title": translation["title"],
            "description": translation["description"],
            "action": translation["action"],
            "severity": translation.get("severity", "low")
        })
    return {"count": len(translated_errors), "errors": translated_errors}

@app.get("/api/system-specs")
def get_system_specs():
    os_info = f"{platform.system()} {platform.release()}"

    try: 
        cpu_cmd = 'powershell -Command "(Get-CimInstance Win32_Processor).Name"'
        cpu_output = subprocess.check_output(cpu_cmd, shell=True, text=True)
        cpu_info = cpu_output.strip()
    except:
        cpu_info = platform.processor()

    try: 
        gpu_cmd = 'powershell -Command "(Get-CimInstance Win32_VideoController).Name"'
        gpu_output = subprocess.check_output(gpu_cmd, shell=True, text=True).strip()
        gpu_lines = [line.strip() for line in gpu_output.split('\n') if line.strip()]
        
        # If your laptop has two GPUs, this specifically hunts for the NVIDIA one
        gpu_info = next((gpu for gpu in gpu_lines if "NVIDIA" in gpu.upper()), gpu_lines[0])
    except:
        gpu_info = "Unknown GPU"
    
    mem = psutil.virtual_memory()
    used_ram = round(mem.used / (1024**3), 1)
    total_ram = round(mem.total / (1024 ** 3), 1)

    boot_time = psutil.boot_time()

    disk = psutil.disk_usage('/')
    total_disk_gb = round(disk.total / (1024**3), 1)
    free_disk_gb = round(disk.free / (1024**3), 1)

    cores = psutil.cpu_count(logical=False)
    threads = psutil.cpu_count(logical=True)

    return { 
        "os": os_info,
        "cpu": cpu_info,
        "gpu": gpu_info,
        "cores": f"{cores} Cores, {threads} Threads",
        "ram": f"{used_ram} GB Used / {total_ram} GB Total",
        "boot_time": boot_time,
        "disk": f"{free_disk_gb} GB Free / {total_disk_gb} GB Total",

    }
@app.get("/api/live")
def get_live_metrics():
    global last_net_bytes, last_net_time

    current_time = time.strftime("%H:%M:%S")
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory().percent
    current_net_bytes = psutil.net_io_counters().bytes_sent + psutil.net_io_counters().bytes_recv
    current_time_now = time.time()
    time_diff = current_time_now - last_net_time

    if time_diff > 0:
        net_mbps = ((current_net_bytes - last_net_bytes) * 8) / 1_000_000 / time_diff
    else:
        net_mbps = 0.0
    last_net_bytes = current_net_bytes
    last_net_time = current_time_now

    try:
        gpu_cmd = 'powershell -Command "((Get-Counter \'\\GPU Engine(*engtype_3D)\\Utilization Percentage\' -ErrorAction SilentlyContinue).CounterSamples | Measure-Object -Property CookedValue -Sum).Sum"'
        gpu_output = subprocess.check_output(gpu_cmd, shell=True, text=True, timeout=2).strip()
        gpu = round(float(gpu_output), 1) if gpu_output else 0.0
        if gpu > 100.0: gpu = 100.0
    except:
        gpu = 0.0

    processes = []

    for proc in psutil.process_iter(['name', 'memory_percent', 'cpu_percent']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    top_procs = sorted(processes, key=lambda p: p['memory_percent'] or 0, reverse=True)[:5]

    clean_procs = []
    for p in top_procs:
        clean_procs.append({
            "name": p['name'],
            "ram": round(p['memory_percent'] or 0, 1),
            "cpu": round(p['cpu_percent'] or 0, 1)
        })

    top_conns = []
    try:
        connections = psutil.net_connections(kind='inet')
        established = [c for c in connections if c.status == 'ESTABLISHED' and c.raddr]

        for conn in established[:5]:
            proc_name = "System/Unknown"
            if conn.pid:
                try:
                    proc_name = psutil.Process(conn.pid).name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            top_conns.append({
                "process": proc_name,
                "ip": conn.raddr.ip,
                "port": conn.raddr.port
            })
    except psutil.AccessDenied:
        top_conns = [{"process": "Requires Admin", "ip": "Hidden", "port": "0"}]
    except Exception as e:
        top_conns = []

    return {
        "timestamp": current_time,
        "cpu": cpu,
        "ram": ram,
        "gpu": gpu,
        "wifi_mbps": round(net_mbps, 2),
        "top_processes": clean_procs,
        "top_connections": top_conns
    }

class ErrorAnalysisReport(BaseModel):
    event_id: int
    title: str
    provider: str
    description: str

@app.post("/api/analyze-error")
def analyze_error(request: ErrorAnalysisReport):
    if not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is missing on the server.")
    
    prompt = f"""
        You are an expert Windows OS Kernel Engineer. Analyze the provided Windows Event Log.
        
        CRITICAL WINDOWS EVENT LOG DETAILS:
        - Event ID: {request.event_id}
        - Title: {request.title}
        - Provider: {request.provider}
        - System Log Description: {request.description}
        
        Provide a highly accurate, actionable diagnostic report using this exact Markdown structure:
        
        ### 🔍 Root Cause Analysis
        * **The Core Issue:** [Provide 2-3 sentences explaining exactly what broke and why this specific provider triggered it.]
        * **System Impact:** [Provide 1-2 sentences explaining if this is a critical hardware failure, a driver crash, or a safe background warning.]
        
        ### 🛠️ Step-by-Step Action Plan
        [Provide 2 to 3 actionable troubleshooting steps using bullet points. For each step, provide a brief 2-sentence explanation of *how* to do it and *why* it helps. Reference specific Windows tools like Device Manager, SFC, or Registry Editor where applicable.]
        
        Constraints: Keep the formatting clean. Do not write massive paragraphs. Be highly technical but accessible.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}" )