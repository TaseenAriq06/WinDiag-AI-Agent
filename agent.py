# psutil is responsible for getting system status, subprocess allows you to run commands like in Windows CMD
# xml import is able to parse messy info from an XML file, sqlite3 is the local database engine storing data
import psutil
import subprocess
import xml.etree.ElementTree as ET
import sqlite3

# creates a file diagnostic.db in the same directory as the script and makes a 'diagnostic.db' file
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
    provider TEXT
)
""")
# commits current transaction to the database so it can save to a file and not stay in your RAM
conn.commit()

cpu_usage = psutil.cpu_percent(interval=1)
mem = psutil.virtual_memory()
battery = psutil.sensors_battery()
power_status = 1 if battery.power_plugged else 0

# INSERT INTO that specific row specific values which gets inserted into the database
cursor.execute( # We use ? to tell the database take this variable as raw data not as a command, prevents SQL Injection
    "INSERT INTO telemetry (cpu_percent, ram_percent, power_plugged) VALUES (?, ?, ?)",
    (cpu_usage, mem.percent, power_status)
)
conn.commit()


print("\n---Fetching Critical Errors---")

EVENT_IDS = [41, 1001, 18, 4101, 88, 10317, 10010, 7011, 6005]
# convert the list of event ids into a single string that Windows understands and can run like EventID=41 or EventID=1001...
id_string = " or ".join([f"EventID={eid}" for eid in EVENT_IDS])

critical_query_cmd = f"""wevtutil qe System "/q:*[System[({id_string})]]" /c:20000 /f:xml /rd:true"""

# Python builds the command string, Windows executes the command, sends the XML back to Python as result.stdout, Python parses XML
result = subprocess.run(
    critical_query_cmd,
    shell=True, # tells Python to open a real Windows CMD to run the command
    text=True,  # tells Python to treat the command as readable text
    capture_output=True # grabs the data and saves it into a result variable for the script to read it internally
)
# wraps the raw data from the OS and normalizes it into a format thats easy to read in one XML file
if result.stdout.strip():
    wrapped_xml = f"<AllEvents>{result.stdout}</AllEvents>"

    root = ET.fromstring(wrapped_xml)
    # Microsoft uses this web link as a folder name for all system event tags and maintain organization
    nameSpace = {'win' : "http://schemas.microsoft.com/win/2004/08/events/event"}
    print("\n---Parsed System Instabilities Found---")

    # findall gets you a list of every <Event> block found in the XML file
    for event in root.findall('win:Event', nameSpace):
        # tells Python to go through the folder structures for each <Event> to pull out the exact XML value
        event_id = event.find('win:System/win:EventID', nameSpace).text
        provider = event.find('win:System/win:Provider', nameSpace).get('Name')
        timestamp = event.find('win:System/win:TimeCreated', nameSpace).get('SystemTime')

        print(f"EventID: {event_id}")
        print(f"Timestamp: {timestamp}")
        print(f"Source Provider: {provider}")
        print("-" * 40)

        # this select statement makes sure that we don't insert duplicate system events into the database
        cursor.execute(
            "SELECT 1 FROM system_events WHERE event_id = ? AND timestamp = ?",
            (int(event_id), timestamp)
        )
        # check if the record exists before inserting another system_event log, prevents duplicate bloating in database (Idempotency)
        if cursor.fetchone() is None:
            cursor.execute(
            "INSERT INTO system_events (event_id, timestamp, provider) VALUES (?, ?, ?)",
            (int(event_id), timestamp, provider)
        )
    conn.commit()
else:
    print("No recent critical errors found. Your system is healthy!")

# Frees up the file by closing the connection and allowing other parts of code to read the database and latest rows
conn.close()
