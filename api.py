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
import threading
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # start the background sensor loop before the server accepts any requests
    sensor_thread = threading.Thread(target=background_sensor_loop, daemon=True)
    sensor_thread.start()
    yield
    # since the thread is daemon, it will die automatically once the main process ends 

app = FastAPI(title = "Diagnostic Agent API", lifespan=lifespan)

# CORS tells the FastAPI server to tell the browser that it allows requests from anyone, so let the data through
# since browsers have strict origin policies, they can block fetching data that aren't on the same domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)
# this try/except block reaches out to Google Servers to check for Gemini API key to set up a connection without crashing program
try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Gemini Client failed to initialize. Error {e}")

# save the total bytes sent/received at the exact moment the server starts, and the current time
FAST_CACHE = {"gpu": 0.0, "net_mbps": 0.00, "top_processes": []}
last_net_bytes = psutil.net_io_counters().bytes_sent + psutil.net_io_counters().bytes_recv
last_net_time = time.time()

def background_sensor_loop():
    """Runs continuously in the API background, calculating slow metrics without blocking the server."""
    global last_net_bytes, last_net_time

    while True:
        # calculates number of bytes sent and received as well as current time, and calculates the difference
        current_net_bytes = psutil.net_io_counters().bytes_sent + psutil.net_io_counters().bytes_recv
        current_time_now = time.time()
        time_diff = current_time_now - last_net_time

        if time_diff > 0:
            # total number of bytes from last call to current call, convert from byte to bits, divide by 1 mill for Megabits divide by elapsed time
            net_mbps = ((current_net_bytes - last_net_bytes) * 8) / 1_000_000 / time_diff
        else:
            net_mbps = 0.0
       
        # log the current bytes and time, so that the API can receive the latest data instantly from fast cache
        last_net_bytes = current_net_bytes
        last_net_time = current_time_now
        FAST_CACHE["net_mbps"] = round(net_mbps, 2)

        try:
            # run a powershell command to find how hard the gpu engine is working percentage wise with subprocess
            gpu_cmd = 'powershell -Command "((Get-Counter \'\\GPU Engine(*engtype_3D)\\Utilization Percentage\' -ErrorAction SilentlyContinue).CounterSamples | Measure-Object -Property CookedValue -Sum).Sum"'
            gpu_output = subprocess.check_output(gpu_cmd, shell=True, text=True, timeout=2).strip()
            gpu = round(float(gpu_output), 1) if gpu_output else 0.0
            FAST_CACHE["gpu"] = min(gpu, 100.0)
        except:
            FAST_CACHE["gpu"] = 0.0
        
        processes_data = []
        # this asks the OS for a list of every running process
        for proc in psutil.process_iter(['name', 'memory_percent', 'cpu_percent']):
            try:
                cpu = proc.cpu_percent(interval=None)
                ram = proc.memory_percent()

                processes_data.append({
                    "name": proc.info['name'] or "Unknown",
                    "ram": round(ram if ram is not None else 0.0, 1),
                    "cpu": round(cpu if cpu is not None else 0.0, 1)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        # only interested in the top 5 processes that are using the most RAM and discard the rest, keeps JSON small and dashboard clean
        top_procs = sorted(processes_data, key=lambda p: p['ram'], reverse=True)[:5]
        # save it to the cache
        FAST_CACHE["top_processes"] = top_procs

        time.sleep(2)

def fetch_data(query: str, params: tuple = (), limit: int = 100):
    """Connects to SQLite, runs a query, and formats the outputs cleanly."""
    # connects to the database to fetch the telemetry data logs
    conn = sqlite3.connect('diagnostic.db')
    # this is telling SQLite to return the data as a tuple with column names attached, converting the database row into Python dicts
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # make sure the most recent data is on the top and a limit to make sure it doesn't load every single row to freeze the server
    # adding params makes sure that the API builds custom queries, immune from SQL Injections
    cursor.execute(f"{query} ORDER BY timestamp DESC LIMIT {int(limit)}", params)
    rows = cursor.fetchall()
    conn.close()

    # it turns the rows from Python dictionaries into a JSON object that is easy for JavaScript to read and fetch data from
    return [dict(row) for row in rows]
    
@app.get("/")
def home():
    return {"message": "Diagnostic API Server is Online"}

# this fetches a snapshot from the database and serves it to the dashboard (Select * retrieves all columns from database in query)
@app.get("/api/telemetry")
def get_telemetry():
    data = fetch_data("SELECT * FROM telemetry")
    return {"count": len(data), "telemetry": data}

@app.get("/api/history")
def get_telemetry_history():
    # grabs the last 20 rows from the database so the live chart loads with previous logs immediately
    data = fetch_data("SELECT timestamp, cpu_percent, ram_percent, power_plugged FROM telemetry", limit=20)
    data.reverse() # the oldest log of the 20 is the first one to show in the chart
    return {"count": len(data), "telemetry": data}

@app.get("/api/live/fast")
def get_live_fast():
    # reads only from psutil and returns this data instantly for the KPI numbers
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory().percent

    return {
        "timestamp": time.strftime("%H:%M:%S"),
        "cpu": cpu,
        "mem": mem,
        "gpu": FAST_CACHE["gpu"],
        "wifi_mbps": FAST_CACHE["net_mbps"]
    }

@app.get("/api/errors")
def get_errors():
    # this tells the query to search only from the past month, not lifetime error logs, keeps API fast and shows relevant logs
    sql_query = "SELECT * FROM system_events WHERE timestamp >= datetime('now', '-30 days')"
    raw_data = fetch_data(sql_query, limit=1000)
    translated_errors = []
    
    for row in raw_data:
        event_id = row["event_id"]

        # creating a new dictionary for each error by combining raw data and metadata
        translated_errors.append({
            "event_id": row["event_id"],
            "timestamp": row["timestamp"],
            "provider": row["provider"],
            "title": f"System Event {row['event_id']}",
            "description": row["description"],
            "action": "Select 'Analyze with Gemini AI' for a full breakdown",
            "severity": "high" if row ["event_id"] in [41, 1001] else "medium" 
        })
    return {"count": len(translated_errors), "errors": translated_errors}

@app.get("/api/system-specs")
def get_system_specs():
    # platorm is native for Python, and tells basic information of a system spec compared to subprocess to command Windows directly
    os_info = f"{platform.system()} {platform.release()}"

    try: 
        # commanding Windows directly in PowerShell asks the WMI database for your hardware's actual details of CPU
        cpu_cmd = 'powershell -Command "(Get-CimInstance Win32_Processor).Name"'
        cpu_output = subprocess.check_output(cpu_cmd, shell=True, text=True)
        cpu_info = cpu_output.strip()
    except Exception as e:
        cpu_info = platform.processor()

    try: 
        gpu_cmd = 'powershell -Command "(Get-CimInstance Win32_VideoController).Name"'
        gpu_output = subprocess.check_output(gpu_cmd, shell=True, text=True).strip()
        gpu_lines = [line.strip() for line in gpu_output.split('\n') if line.strip()]
        
        # most devices have two GPUs like a integrated one and dedicated one, this searches for the performance GPU instead
        gpu_info = next((gpu for gpu in gpu_lines if "NVIDIA" in gpu.upper()), gpu_lines[0])
    except Exception as e:
        gpu_info = "Unknown GPU: " + str(e)
    
    mem = psutil.virtual_memory()
    # computer hardware reports memory in bytes, so converting 1024^3 is necessary to convert it into Gigabytes, to .1 decimal place
    used_ram = round(mem.used / (1024**3), 1)
    total_ram = round(mem.total / (1024 ** 3), 1)

    boot_time = psutil.boot_time()

    disk = psutil.disk_usage('/')
    total_disk_gb = round(disk.total / (1024**3), 1)
    free_disk_gb = round(disk.free / (1024**3), 1)

    # cores are the physical silicon on your chip, threads is when each physical core acts like two virtual cores, showing hardware limits
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

    current_time = time.strftime("%H:%M:%S")
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory().percent
    
    gpu = FAST_CACHE["gpu"]
    net_mbps = FAST_CACHE["net_mbps"]

    clean_procs = FAST_CACHE["top_processes"]

    top_conns = []
    try:
        # this pulls every single network connection that the device has 
        connections = psutil.net_connections(kind='inet')
        # you only want connections that are talking to another server right now and ones with remote addresses
        established = [c for c in connections if c.status == 'ESTABLISHED' and c.raddr]

        for conn in established[:5]:
            proc_name = "System/Unknown"
            if conn.pid:
                try:
                    # network connection only knows the Process ID, and tries to see who owns the PID
                    proc_name = psutil.Process(conn.pid).name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            # creates a dictionary containing Proecss Name, Remote IP where the data is going, and the Port the data is using
            top_conns.append({
                "process": proc_name,
                "ip": conn.raddr.ip,
                "port": conn.raddr.port
            })
    except psutil.AccessDenied:
        # this makes sure that the API returns a friendly message instead of crashing since it might need Admin to get network connection data
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

# when the frontend sends a request, FastAPI automatically checks incoming JSON, this protects Gemini API from receiving junk data
class ErrorAnalysisReport(BaseModel):
    event_id: int
    title: str
    provider: str
    description: str

@app.post("/api/analyze-error")
def analyze_error(request: ErrorAnalysisReport):
    if not os.environ.get("GEMINI_API_KEY"):
        # this makes sure that the API key lives on the server, if it's missing, the endpoint returns a 500 error to the server
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is missing on the server.")
    
    # this is context injection, definining a markdown structure of a root cause and action plan for the AI to return the data as a report
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
        # the server sends the prompt to gemini cloud, the client handles the network heavy lifting
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        # when the AI is done thinking, it returns a string and wrap it as a Python dict for JSON to read cleanly
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}" )

@app.get("/api/health-summary")
def get_health_summary():
    conn = None
    
    try:
        conn = sqlite3.connect('diagnostic.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # get the averages of CPU and RAM from the last 24 hours
        cursor.execute("""
            SELECT
                AVG(cpu_percent) as avg_cpu,
                MAX(cpu_percent) as peak_cpu,
                AVG(ram_percent) as avg_ram,
                MAX(ram_percent) as peak_ram
            FROM telemetry
            WHERE timestamp >= datetime('now', '-1 day')
        """)
        stats = dict(cursor.fetchone())
        
        # count how many secs the CPU was over 80% in the last 24 hours
        cursor.execute("""
            SELECT COUNT(*) as high_cpu_time
            FROM telemetry
            WHERE cpu_percent >= 80.0 AND timestamp >= datetime('now', '-1 day')
        """)
        high_cpu_time = cursor.fetchone()["high_cpu_time"]

        # check with system-events table to see if anything crashed today
        cursor.execute("""
            SELECT COUNT(*) as recent_errors
            FROM system_events
            WHERE timestamp >= datetime('now', '-1 day')             
        """)
        recent_errors = cursor.fetchone()["recent_errors"]
    finally:
        if conn: conn.close()

    # if the database is new and empty, prevent Python from crashing over no values
    return {
        "avg_cpu": round(stats["avg_cpu"] or 0, 1),
        "peak_cpu": round(stats["peak_cpu"] or 0, 1),
        "avg_ram": round(stats["avg_ram"] or 0, 1),
        "peak_ram": round(stats["peak_ram"] or 0, 1),
        "high_cpu_seconds": high_cpu_time,
        "critical_events_24h": recent_errors
    }