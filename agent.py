import psutil
import subprocess
import xml.etree.ElementTree as ET
import sqlite3

conn = sqlite3.connect('diagnostic.db')
cursor = conn.cursor()


cursor.execute("""
CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_percent REAL,
    ram_percent REAL,
    power_plugged INTEGER
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    timestamp TEXT,
    provider TEXT
)
""")
conn.commit()

cpu_usage = psutil.cpu_percent(interval=1)
mem = psutil.virtual_memory()
battery = psutil.sensors_battery()
power_status = 1 if battery.power_plugged else 0

print(f"CPU Load Tracking: {cpu_usage}%")
print(f"RAM Capacity Allocation: {mem.percent}%")
print(f"Wall Power Source Connected: {battery.power_plugged}")

cursor.execute(
    "INSERT INTO telemetry (cpu_percent, ram_percent, power_plugged) VALUES (?, ?, ?)",
    (cpu_usage, mem.percent, power_status)
)
conn.commit()


print("\n---Fetching Critical Errors---")

EVENT_IDS = [41, 1001, 18, 4101, 88, 10317, 10010, 7011, 6005]
id_string = " or ".join([f"EventID={eid}" for eid in EVENT_IDS])

critical_query_cmd = f"""wevtutil qe System "/q:*[System[({id_string})]]" /c:20000 /f:xml /rd:true"""

result = subprocess.run(
    critical_query_cmd,
    shell=True,
    text=True,
    capture_output=True
)

if result.stdout.strip():
    wrapped_xml = f"<AllEvents>{result.stdout}</AllEvents>"

    root = ET.fromstring(wrapped_xml)
    nameSpace = {'win' : "http://schemas.microsoft.com/win/2004/08/events/event"}
    print("\n---Parsed System Instabilities Found---")

    for event in root.findall('win:Event', nameSpace):
        event_id = event.find('win:System/win:EventID', nameSpace).text
        provider = event.find('win:System/win:Provider', nameSpace).get('Name')
        timestamp = event.find('win:System/win:TimeCreated', nameSpace).get('SystemTime')

        print(f"EventID: {event_id}")
        print(f"Timestamp: {timestamp}")
        print(f"Source Provider: {provider}")
        print("-" * 40)

        cursor.execute(
            "SELECT 1 FROM system_events WHERE event_id = ? AND timestamp = ?",
            (int(event_id), timestamp)
        )

        if cursor.fetchone() is None:
            cursor.execute(
            "INSERT INTO system_events (event_id, timestamp, provider) VALUES (?, ?, ?)",
            (int(event_id), timestamp, provider)
        )
    conn.commit()
else:
    print("No recent critical errors found. Your system is healthy!")

conn.close()
