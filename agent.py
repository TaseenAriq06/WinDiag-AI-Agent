# psutil is responsible for getting system status, subprocess allows you to run commands like in Windows CMD
# xml import is able to parse messy info from an XML file, sqlite3 is the local database engine storing data
import psutil
import subprocess
#import xml.etree.ElementTree as ET
import sqlite3
import threading
import time
import csv
import io

def setup_database():
    try:
        # creates a file diagnostic.db in the same directory as the script
        conn = sqlite3.connect('diagnostic.db')
        # be able to use sql commands by making a cursor
        cursor = conn.cursor()

        # Three quotations is a docstring that allows us to write multiple strings without breaks
        # CREATE TABLE for telemetry makes sure there is a table to store system's vital signs like CPU and RAM
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            cpu_percent REAL,
            ram_percent REAL,
            power_plugged INTEGER
        )
        """)
        # CREATE TABLE for system_events makes sure that there is a table to store discrete events that happened at a certain time
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER,
            timestamp TEXT,
            provider TEXT,
            description TEXT
        )
        """)
        # commits current transaction to the database so it can save to a file and not stay in your RAM
        conn.commit()
    finally:
        if conn: conn.close()

def event_log_scrapper():
    while True:
        conn = None
        try:
            print("\n[Thread-2] --- Fetching Critical Errors ---")
            conn = sqlite3.connect('diagnostic.db')
            cursor = conn.cursor()
            
            # this powershell command uses a filter to retrieve level 1 & 2 errors limits, and formats the output as CSV for easy parsing in Python
            # this powershell command retrieves level 1 & 2 errors from the last 30 days, formatting the output as CSV
            ps_cmd = """powershell -Command "$startDate = (Get-Date).AddDays(-30); Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2} -ErrorAction SilentlyContinue | Where-Object {$_.TimeCreated -ge $startDate} | Select-Object Id, @{N='TimeCreated';E={$_.TimeCreated.ToString('s')}}, ProviderName, Message | ConvertTo-Csv -NoTypeInformation" """

            # python builds the command string, Windows executes the command, sends the XML back to Python as result.stdout, Python parses XML
            result = subprocess.run(
                ps_cmd,
                shell=True, # tells Python to open a PowerShell to run the command
                text=True,  # tells Python to treat the command as readable text
                capture_output=True # grabs the data and saves it into a result variable for the script to read it internally
            )
            # wraps the raw data from the OS and normalizes it into a format thats easy to read in one XML file
            if result.stdout.strip():
                # turns raw CSV output into a format that can be iterable over in Python, and extract specific fields for each error event
                csv_reader = csv.reader(io.StringIO(result.stdout.strip()))
                next(csv_reader, None) # skip the header row of the CSV output since it just contains column names 

                # ignore typical Windows events that are not useful for diagnostics, preventing bloating the database
                IGNORED_IDS = {'10016', '1108', '1014', '10010'}

                # assign 4 variables to the 4 columns of the CSV output, and insert those values into the system_events table 
                for row in csv_reader:
                    if len(row) < 4:
                        continue
                    event_id = row[0]
                    timestamp = row[1]
                    provider = row[2]
                    description = row[3]
                    
                    if event_id in IGNORED_IDS:
                        continue

                    # this select statement makes sure that we don't insert duplicate system events into the database
                    cursor.execute(
                        "SELECT 1 FROM system_events WHERE event_id = ? AND timestamp = ?",
                        (int(event_id), timestamp)
                    )
                    # check if the record exists before inserting another system_event log, prevents duplicate bloating in database (Idempotency)
                    if cursor.fetchone() is None:
                        cursor.execute(
                        "INSERT INTO system_events (event_id, timestamp, provider, description) VALUES (?, ?, ?, ?)",
                        (int(event_id), timestamp, provider, description)
                    )
                conn.commit()
                print("[Thread-2] Event Logs Updated")
            else:
                print("[Thread-2] No critical errors found")
        except Exception as e:
            print(f"[Thread-2] Error in scrapper: {e}")
        finally:
            if conn: conn.close()
        # pause this thread just so it doesn't spam Windows
        time.sleep(60)

def telemetry_loop():
    """Runs continuously on the main thread, logging system health every second."""
    print("[Thread-1] Starting Telemetry Loop...")
    while True:
        conn = None
        try:
            conn = sqlite3.connect('diagnostic.db')
            cursor = conn.cursor()
            # it measures the cpu percentage used by the system over a 1 second interval 
            # which gives us a real-time snapshot of how much processing power is being utilized
            cpu_usage = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory()
            battery = psutil.sensors_battery()
            power_status = 1 if battery and battery.power_plugged else 0

            # INSERT INTO that specific row specific values which gets inserted into the database
            cursor.execute( # We use ? to tell the database take this variable as raw data not as a command, prevents SQL Injection
                "INSERT INTO telemetry (cpu_percent, ram_percent, power_plugged) VALUES (?, ?, ?)",
                (cpu_usage, mem.percent, power_status)
            )
            conn.commit()

            # a continuous printout of the system's CPU and RAM usage every second so we can see the telemetry log into the database 
            print(f"[Thread-1] 📊 Telemetry Logged: CPU {cpu_usage}% | RAM {mem.percent}%")
            
        except Exception as e:
            print(f"[Thread-1] Error in telemetry: {e}")
        finally:
            if conn: conn.close()

def cleanup_old_data():
    conn = sqlite3.connect('diagnostic.db')
    cursor = conn.cursor()
    # delete telemetry data older than 7 days 
    cursor.execute("DELETE FROM telemetry WHERE timestamp < datetime('now', '-7 days')")
    conn.commit()
    if conn: conn.close()

# the moment the script runs, it starts a separate thread that runs the event_log_scrapper function in the background
# while the main thread runs the telemetry_loop function, allowing both to operate simultaneously without blocking each other
if __name__ == "__main__":
    setup_database()

    # daemon thread means it will automatically close when the main program exits
    scraper_thread = threading.Thread(target=event_log_scrapper, daemon=True) 
    scraper_thread.start()

    try:
        telemetry_loop()
    except KeyboardInterrupt:
        print("\n 🛑 Shutting down WinDiag Agent.")