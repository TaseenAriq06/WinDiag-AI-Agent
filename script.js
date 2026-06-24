// these are global variables that every function can read and write to, 'let' can be change but 'const' cant
let sortDirection = 1; 
let currentSortColumn = '';
let allErrors = [];
let filteredErrors = []; 
let currentPage = 1;
const rowsPerPage = 10;
let activeErrorForAI = null; 

// an dict to store all svg code 
const Icons = {
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`,
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-linkedin" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>`,
    github: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>`
};

// save a variable by getting the element themeToggle from the document as a button variable 
const themeToggleBtn = document.getElementById('themeToggle');
document.getElementById('linkedinBtn').innerHTML = Icons.linkedin
document.getElementById('githubBtn').innerHTML = Icons.github

// localStorage stores the user's preference if they originally had dark mode or light mode and forces <body> to set the preference
if(localStorage.getItem('theme') == 'dark'){
    // targets the main body of HTML file, tells the browser to add the word 'dark-mode' as a class list to use CSS attributes defined
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = Icons.sun + ' Light Mode';
} else {
    themeToggleBtn.innerHTML = Icons.moon + ' Dark Mode';
}

// executes arrow function when mouse clicks on dark mode
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    if(document.body.classList.contains('dark-mode')){
        themeToggleBtn.innerHTML = sunIcon + 'Light Mode';
        localStorage.setItem('theme', 'dark');
        
        // change chart text to light gray and repaint if in dark mode
        if (localStorage.getItem('theme') === 'dark'){
            telemetryChart.options.plugins.legend.labels.color = '#94a3b8';

            // x-Axis (bottom time labels)
            telemetryChart.options.scales.x.ticks.color = '#94a3b8';
            telemetryChart.options.scales.x.grid.color = '#334155';
            
            // y-Axis (left percentages)
            telemetryChart.options.scales.y.ticks.color = '#94a3b8';
            telemetryChart.options.scales.y.grid.color = '#334155';
            
            // y1-Axis (right network speed)
            telemetryChart.options.scales.y1.ticks.color = '#94a3b8';
            telemetryChart.options.scales.y1.grid.color = '#334155';

            telemetryChart.update();
        }
    } else {
        themeToggleBtn.innerHTML = moonIcon + 'Dark Mode';
        localStorage.setItem('theme', 'light');

        // change chart text to dark gray and repaint
        if(typeof telemetryChart !== 'undefined'){
            telemetryChart.options.plugins.legend.labels.color = '#6b7280';

            // x-Axis (bottom time labels)
            telemetryChart.options.scales.x.ticks.color = '#6b7280';
            telemetryChart.options.scales.x.grid.color = '#e5e7eb';
            
            // y-Axis (left percentages)
            telemetryChart.options.scales.y.ticks.color = '#6b7280';
            telemetryChart.options.scales.y.grid.color = '#e5e7eb';
            
            // y1-Axis (right network speed)
            telemetryChart.options.scales.y1.ticks.color = '#6b7280';
            telemetryChart.options.scales.y1.grid.color = '#e5e7eb';

            telemetryChart.update();
        }
    }
});

function filterLogs(resetPage = true) {
    const select = document.getElementById('severityFilter');
    // finds your search bar and grabs what the user typed, make it strictly lowercase for easy searches
    const query = document.getElementById('searchInput').value.toLowerCase();
    // finds the dropdown menu and and grabs the currently selected option
    const selectedSeverity = select.value;
    // clear old color classes and apply new one
    select.classList.remove('selected-all', 'selected-high', 'selected-medium', 'selected-low');
    select.classList.add(`selected-${selectedSeverity}`);
    
    // this loops through all errors and checks if the user's value matches the log history anywhere
    filteredErrors = allErrors.filter(error => {
        const textMatch = error.title.toLowerCase().includes(query) ||
                          error.provider.toLowerCase().includes(query) ||
                          error.event_id.toString().includes(query);
        // checks if the user selected all severities or a specific one, and return the true errors that match the text and severity
        const severityMatch = (selectedSeverity === 'all') || (error.severity === selectedSeverity);
        return textMatch && severityMatch;
    });
    // forces you to go back to page 1 after resetting the filter search
    if(resetPage == true){
        currentPage = 1;
    }
    renderTable();
}
// using window attaches this function to a global browser window that allows html to have direct access to clicking a column
window.sortLogs = function(column) {
    if (currentSortColumn === column) {
        // if the direction was forward (A-Z) it would be 1, multiplying by -1 reverses the order to (Z-A)
        sortDirection *= -1;
    } else {
        sortDirection = 1;
        // user clicked a brand new column so reset the sorting back to forward and remember the new column to sort 
        currentSortColumn = column;
    }
    filteredErrors.sort((a, b) => {
        // look inside each object a and b and pull out info that matches the column info 
        let valA = a[column];
        let valB = b[column];
        // if valA is 50 and valB is 100, 50-100 = -50 meaning valA should have higher ranking than valB and multiply by sortDirection
        if (column === 'event_id') return (valA - valB) * sortDirection;

        // compares word A to word B to return the actual sorting direction
        return valA.toString().localeCompare(valB.toString()) * sortDirection;
    });
    currentPage = 1; 
    renderTable();
};

window.exportToCSV = function() {
    // if there are no errors that match the current filter, then alert the user that there is nothing to export and exit
    if (filteredErrors.length === 0) {
        alert("No logs match your current filter. Nothing to export!");
        return;
    }

    const headers = ["Timestamp", "Event ID", "Severity", "Classification", "Provider", "Description"];
    // using .map to loop through the errors, take an item and change it into something different
    const csvRows = filteredErrors.map(err => {
        const date = new Date(err.timestamp).toLocaleString('en-US');
        
        // treat everything inside the quotes as a block of text so it doesnt seperate into columns due to commas
        const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
        
        // this will piece the error information all together into a single string of text
        return [
            escapeCSV(date),
            err.event_id,
            escapeCSV(err.severity.toUpperCase()),
            escapeCSV(err.title),
            escapeCSV(err.provider),
            escapeCSV(err.description)
        ].join(',');
    });
    // this makes a readable string format of today's date
    const today = new Date().toISOString().slice(0, 10);
    // seperate headers into columns and uses spread operator to dump translated row strings out of the array 
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    // compresses the giant string of text into raw file format, generate a temp url that points to binary large object in memory
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // take a blank <a> anchor link tag and set href to fake url, hidden visibility with the name of the download csv file as well
    const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `System_Diagnostic_Report_${today}.csv`,
    });
    a.style.display = 'none';

    // forces the browser to download the file by inserting <a> into the HTML, then remove it to ensure garbage collection after clicked
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
// this function is responsible for the badge colors on the system error log tables 
function getSeverityColors(severity) {
    if (severity === 'high') {
        return { bg: '#ef4444', text: '#ffffff', badgeBg: '#fee2e2', badgeText: '#b91c1c' }; 
    } else if (severity === 'medium') {
        return { bg: '#f97316', text: '#ffffff', badgeBg: '#ffedd5', badgeText: '#c2410c' }; 
    } else {
        return { bg: '#eab308', text: '#1f2937', badgeBg: '#fef9c3', badgeText: '#a16207' }; 
    }
}

function assignCorrectSeverity(eventId, provider, title) {
    const textToSearch = `${provider} ${title}`.toLowerCase();
    // to assign the correct severity, it checks through each of those keywords to see if it exists in the title and provider
    const highKeywords = [
        'fatal', 'kernel', 'bugcheck', 'corrupt', 'failure', 'failed', 
        'denied', 'unhandled', 'bluescreen', 'deadlock', 'terminated unexpectedly',
        'security service', 'hardware error'
    ];
    // if the word does exist, return the severity as a critical one
    if (highKeywords.some(keyword => textToSearch.includes(keyword))) {return 'high';}

    const mediumKeywords = [
        'timeout', 'timed out', 'warning', 'unable to start', 'could not connect',
        'retry', 'deprecate', 'unexpected shutdown', 'service control'
    ];

    if (mediumKeywords.some(keyword => textToSearch.includes(keyword))) {return 'medium';}

    const lowKeywords = [
        'success', 'information', 'started', 'initialized', 'dcom', 
        'distributedcom', 'successfully', 'running'
    ];

    if (lowKeywords.some(keyword => textToSearch.includes(keyword))) {return 'low';}

    return 'low';
}

// check the theme of the dashboard and set initial chart text/grid colors accordingly
const isDarkTheme = document.body.classList.contains('dark-mode');
const initTextColor = isDarkTheme ? '#94a3b8' : '#6b7280';
const initGridColor = isDarkTheme ? '#334155' : '#e5e7eb';
// searches for telemetryChart id and uses built in drawing methods to paint that canvas 
const ctx = document.getElementById('telemetryChart').getContext('2d');
const telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'CPU Usage (%)', data: [], borderColor: '#2563eb', backgroundColor: '#2563eb33', tension: 0.2, fill: true, yAxisID: 'y' },
            { label: 'RAM Usage (%)', data: [], borderColor: '#10b981', backgroundColor: '#10b98133', tension: 0.2, fill: true, yAxisID: 'y' },
            { label: 'GPU Usage (%)', data: [], borderColor: '#8b5cf6', backgroundColor: '#8b5cf633',tension: 0.2, fill: true, yAxisID: 'y' },
            { label: 'Network Speed (Mbps)', data: [], borderColor: '#f06e69', backgroundColor: '#f06e6933', tension: 0.2, fill: true, yAxisID: 'y1' }
        ]
    },
    options: { // makes sure the chart is adjustable based on window size and stretch depending on CSS attributes
        responsive: true, maintainAspectRatio: false, 
        plugins:{
            legend:{
                labels:{
                    color: initTextColor
                }
            }
        },
        scales: { 
            x: {
                ticks: { color: initTextColor },
                grid: { color: initGridColor },
            },
            // created a dual axis chart keeping lines readable without one y values overriding the other 
            y: { 
                type: 'linear', display: true, position: 'left', beginAtZero: true, max: 100, 
                title: { display: true, text: 'Utilization (%)', color: '#43785c' },
                ticks: { color: initTextColor },
                grid: { color: initGridColor }
            },
            y1: { 
                type: 'linear', display: true, position: 'right', beginAtZero: true, 
                title: { display: true, text: 'Network (Mbps)', color: '#f06e69' },
                ticks: { color: initTextColor }, 
                grid: { drawOnChartArea: true, color: initGridColor} } 
        }
    }
});

async function fetchHealthSummary(){
    // finds the div id, make it visible, and add a inner HTML text that waits for the info to be visible
    const summaryBox = document.getElementById('healthSummaryBox')

    summaryBox.style.display = 'block';
    summaryBox.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Analyzing 24-hour telemetry vault...</span>';

    try { // waits for the api response by fetching the data from the JSON file, 'no-store' forces Python to ask for new calculations
        const response = await fetch('http://127.0.0.1:8000/api/health-summary', { cache: 'no-store' });
        const data = await response.json()

        summaryBox.innerHTML = `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Avg CPU %:</span> <strong style="color: var(--text-main);">${data.avg_cpu}%</strong>
            </div>
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Peak CPU %:</span> <strong style="color: ${data.peak_cpu > 80 ? '#ef4444' : 'var(--text-main)'};">${data.peak_cpu}%</strong>
            </div>
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Avg RAM %:</span> <strong style="color: var(--text-main);">${data.avg_ram}%</strong>
            </div>
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Peak RAM %:</span> <strong style="color: var(--text-main);">${data.peak_ram}%</strong>
            </div>
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Time >80% CPU:</span> <strong style="color: var(--text-main);">${data.high_cpu_seconds} sec</strong>
            </div>
            <div style="padding-top: 8px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Critical Errors:</span> 
                <strong style="color: ${data.critical_events_24h > 0 ? '#ef4444' : '#10b981'};">${data.critical_events_24h}</strong>
            </div>
        `;
    } catch (error) {
        console.error("Error fetching health summary: ", error)
        summaryBox.innerHTML = '<span style="color: red;">Failed to load report from server.</span>';
    }
}

async function loadChartHistory() {
    try { // loads the historical telemetry data from the API and populates the chart when the page first loads
        const response = await fetch('http://127.0.0.1:8000/api/history');
        const result = await response.json();

        result.telemetry.forEach(row => {
            // extract just the time (HH:MM:SS) from the timestamp for cleaner x-axis labels
            const timeLabel = row.timestamp.slice(-8);
            // push the historical telemetry data into the chart's datasets
            telemetryChart.data.labels.push(timeLabel);
            telemetryChart.data.datasets[0].data.push(row.cpu_percent);
            telemetryChart.data.datasets[1].data.push(row.ram_percent);
            telemetryChart.data.datasets[2].data.push(0); 
            telemetryChart.data.datasets[3].data.push(0); 
        });
        telemetryChart.update();
    } catch (e) { console.error("Failed to load chart history", e); }
}

async function fetchLiveFast() {
    try { // lightweight API call that fetches most recent KPI usages for the top cards on the dashboard
        const response = await fetch('http://127.0.0.1:8000/api/live/fast', { cache: 'no-store' });
        const data = await response.json();
        document.getElementById('live-val-cpu').innerText = data.cpu.toFixed(1);
        document.getElementById('live-val-ram').innerText = data.ram.toFixed(1);
        document.getElementById('live-val-gpu').innerText = data.gpu.toFixed(1);
        document.getElementById('live-val-net').innerText = data.wifi_mbps.toFixed(2);
    } catch(e) {}
}

async function fetchLiveTelemetry() {
    try { // more intensive API call that fetches telemetry along with top processes and network connections to update live chart
        const response = await fetch('http://127.0.0.1:8000/api/live', { cache: 'no-store' });
        const data = await response.json();
        
        document.getElementById('live-val-cpu').innerText = data.cpu.toFixed(1);
        document.getElementById('live-val-ram').innerText = data.ram.toFixed(1);
        document.getElementById('live-val-gpu').innerText = data.gpu.toFixed(1);
        document.getElementById('live-val-net').innerText = data.wifi_mbps.toFixed(2);

        const processBox = document.getElementById('processList');
        processBox.innerHTML = ''; 

        // if the API is still calculating the top processes and returns an empty array, show a message instead of empty box
        if(data.top_processes.length == 0){
            processBox.innerHTML = '<div style="color: var(--text-muted); text-align: center;">Loading processes...</div>';
        } else {
            // this updates the top processes section by looping through the API response and painting each process as a row
            data.top_processes.forEach(proc => {
                const row = `
                    <div style="display: flex; justify-content: space-between; background: var(--card-bg); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
                        <strong style="color: var(--text-main);">${proc.name}</strong>
                        <span style="color: var(--text-muted);">
                            <span style="color: #10b981; font-weight: bold;">${proc.ram}% RAM</span> | 
                            <span style="color: #2563eb;">${proc.cpu}% CPU</span>
                        </span>
                    </div>
                `;
                processBox.innerHTML += row;
            });
        }
        const networkBox = document.getElementById('networkList');
        networkBox.innerHTML = ''; 

        if (data.top_connections.length === 0) {
            networkBox.innerHTML = '<div style="color: var(--text-muted); padding: 8px;">No active connections found.</div>';
        } else { // this updates the active network connection box through the API response to show the connection ip and port
            data.top_connections.forEach(conn => {
                const row = `
                    <div style="display: flex; justify-content: space-between; background: var(--card-bg); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
                        <strong style="color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;" title="${conn.process}">${conn.process}</strong>
                        <span style="color: var(--text-muted);">
                            <span style="color: #f06e69; font-weight: bold;">${conn.ip}</span> : ${conn.port}
                        </span>
                    </div>
                `;
                networkBox.innerHTML += row;
            });
        }
        // push the new usage information onto the chart after loading the previous 20 logs from history api
        telemetryChart.data.labels.push(data.timestamp);
        telemetryChart.data.datasets[0].data.push(data.cpu);
        telemetryChart.data.datasets[1].data.push(data.ram);
        telemetryChart.data.datasets[2].data.push(data.gpu);
        telemetryChart.data.datasets[3].data.push(data.wifi_mbps);
        // make sure the chart does not get bloated with 20+ logs so it updates continuously 
        if (telemetryChart.data.labels.length > 20) {
            telemetryChart.data.labels.shift();
            telemetryChart.data.datasets[0].data.shift();
            telemetryChart.data.datasets[1].data.shift();
            telemetryChart.data.datasets[2].data.shift();
            telemetryChart.data.datasets[3].data.shift();
        }
        telemetryChart.update();
    } catch (error) { console.error("Error fetching live data:", error); }
}

window.openModal = function(globalIndex) {
    // this allows us to pull up the correct error information when a user clicks on a log row
    const error = filteredErrors[globalIndex];
    if (!error) return;
    // save the currently active error to a global variable so that the AI analysis button can access it
    activeErrorForAI = error; 
    
    const aiBtn = document.getElementById('aiBtn');
    const responseContainer = document.getElementById('aiResponseContainer');
    const responseText = document.getElementById('aiResponseText');

    // create a unique cache key for this specific error by combining event_id and provider, and sanitize the provider string to ensure it's safe for use as a key
    const safeProvider = String(error.provider).replace(/[^a-zA-Z0-9]/g, '_');
    const cacheKey = `gemini_cache_${error.event_id}_${safeProvider}`;
    const cachedAnalysis = localStorage.getItem(cacheKey);

    // if there is cached analysis for this error, display it immediately and disable the AI button to prevent redundant API calls. 
    // otherwise, prepare the modal for a new analysis
    if (cachedAnalysis) {
        responseContainer.style.display = 'block';
        responseText.innerHTML = marked.parse(cachedAnalysis);
        aiBtn.innerText = 'Analysis Loaded from Memory';
        aiBtn.disabled = true; 
    } else {
        responseContainer.style.display = 'none';
        responseText.innerText = '';
        aiBtn.disabled = false;
        aiBtn.innerText = 'Analyze with Gemini AI';
    }
    // this takes the raw timestamp from the API and converts it into a readable format for the modal display
    // also gets the appropriate badge colors based on severity
    const rowDate = new Date(error.timestamp);
    const cleanRowTime = rowDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    const colors = getSeverityColors(error.severity);

    // fills all missing info in the modal with the error information from the API
    document.getElementById('modalTitle').innerText = error.title;
    document.getElementById('modalEventId').innerText = error.event_id;
    document.getElementById('modalEventId').style.backgroundColor = colors.badgeBg;
    document.getElementById('modalEventId').style.color = colors.badgeText;
    document.getElementById('modalTime').innerText = cleanRowTime;
    document.getElementById('modalProvider').innerText = error.provider;
    document.getElementById('modalDescription').innerText = error.description;
    document.getElementById('modalAction').innerText = error.action;

    document.getElementById('logModal').style.display = 'block';
}
// this function allows the user to click outside the modal or on the close button to exit the modal and return to the dashboard
window.closeModal = function(event) {
    if (!event || event.target.className === 'modal-overlay') {
        document.getElementById('logModal').style.display = 'none';
    }
}
// make a network request and runs a safety check so function doesnt crash if reading empty data 
window.askGemini = async function() {
    if (!activeErrorForAI) return;

    const aiBtn = document.getElementById('aiBtn');
    const responseContainer = document.getElementById('aiResponseContainer');
    const responseText = document.getElementById('aiResponseText');

    // generates a cache key so it knows where to save the new analysis for when the AI finishes
    const safeProvider = String(activeErrorForAI.provider).replace(/[^a-zA-Z0-9]/g, '_');
    const cacheKey = `gemini_cache_${activeErrorForAI.event_id}_${safeProvider}`;

    // lock the button so user cant spam requests, changes into loading button, displays a message to show AI is thinking
    aiBtn.disabled = true;
    aiBtn.innerText = 'Consulting Kernel Experts (Loading)...';
    responseContainer.style.display = 'block';
    responseText.innerHTML = '<em>Analyzing logs and checking system components...</em>';

    // fetch AI response from API endpoint, with POST method to send information to process formatted as a JSON object shipping to Python
    try {
        const response = await fetch('http://127.0.0.1:8000/api/analyze-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: activeErrorForAI.event_id,
                title: activeErrorForAI.title,
                provider: activeErrorForAI.provider,
                description: activeErrorForAI.description
            })
        });
        const data = await response.json();
        // makes sure if python returned successful status code, saves answer to localstorage with cachekey, turns raw markdown into HTML
        if (response.ok) { 
            localStorage.setItem(cacheKey, data.analysis);
            responseText.innerHTML = marked.parse(data.analysis);
            aiBtn.innerText = 'Analysis Complete';
        } else { 
            responseText.innerHTML = `<span style="color: red;">Error: ${data.detail || 'Failed to generate analysis.'}</span>`;
            aiBtn.disabled = false;
            aiBtn.innerText = '❌ Try Again';
        }
        // if fetch fails completely jumps to this catch block and replies with a failure error message
    } catch (error) { 
        console.error("AI API Error:", error);
        responseText.innerHTML = '<span style="color: red;">Failed to connect to local server endpoint. Make sure the API is running.</span>';
        aiBtn.disabled = false;
        aiBtn.innerText = '❌ Try Again';
    }
}

function renderTable() {
    const tableBody = document.getElementById('logTableBody');
    tableBody.innerHTML = ''; // cleans the table before rendering table with new info to prevent duplicates
    
    if (filteredErrors.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No system logs match your filters.</td></tr>`;
        document.getElementById('pageIndicator').innerText = `of 1`;
        document.getElementById('pageInput').value = 1;
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        return;
    }
    // rounds up to the higher quotient to display a even number of logs per page 
    const totalPages = Math.ceil(filteredErrors.length / rowsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    // makes sure it starts at its corresponding index every page like page 2 should start at index 10 (2-1)*10
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    // takes massive array of data and cuts it to 10 logs per page on the screen
    const currentErrors = filteredErrors.slice(startIndex, endIndex);

    currentErrors.forEach((error, index) => {
        // if you click a row, it needs to know which log it needs to open a modal for 
        const globalIndex = startIndex + index; 

        const rowDate = new Date(error.timestamp);
        const cleanRowTime = rowDate.toLocaleString('en-US', { month: 'short', weekday: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        const rowColors = getSeverityColors(error.severity);
        // template literal to inject javascript variables in raw html for each row 
        const row = `
            <tr class="clickable-row" onclick="openModal(${globalIndex})">
                <td style="white-space: nowrap;">${cleanRowTime}</td>
                <td><span class="badge" style="background-color: ${rowColors.badgeBg}; color: ${rowColors.badgeText};">${error.event_id}</span></td>
                <td><strong>${error.title}</strong></td>
                <td>
                    <div style="font-weight: bold; color: var(--text-main);">${error.provider}</div>
                    <div style="color: var(--text-muted); font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">
                        ${error.description}
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
    
    document.getElementById('pageInput').value = currentPage;
    document.getElementById('pageInput').max = totalPages;
    document.getElementById('pageIndicator').innerText = `of ${totalPages}`;
    document.getElementById('prevBtn').disabled = (currentPage === 1); // cant go backwards if you are already on page 1
    document.getElementById('nextBtn').disabled = (currentPage === totalPages);
}

window.changePage = function(direction) {
    currentPage += direction;
    renderTable();
};

window.goToPage = function() {
    const pageInput = document.getElementById('pageInput');
    let targetPage = parseInt(pageInput.value); // make whatever value the user enters into a integer
    const totalPages = Math.ceil(filteredErrors.length / rowsPerPage) || 1; // calculates max number of pages or page 1 if there is no errors
    // forces user to only be able to type numbers and not characters
    if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
    else if (targetPage > totalPages) targetPage = totalPages; // if user number higher than total pages, return last page
    
    currentPage = targetPage;
    renderTable();
};

async function checkSystemErrors() {
    try {
        // fetches data from this api endpoint and ignore saved cache and translate it into json as a result
        const response = await fetch('http://127.0.0.1:8000/api/errors', { cache: 'no-store' });
        const result = await response.json();
        
        // if the server found any errors, loop through the array of error objects 
        if (result.count > 0) {
            allErrors = result.errors.map(error => {
                return {
                    // uses the spread operator to take existing info and unpack it into a new object to not lose data
                    ...error,
                    // calculates how critical the severity is and overwrites it for that specific log
                    severity: assignCorrectSeverity(error.event_id, error.provider)
                };
            });
            // apply any active filters to rebuild the table
            filterLogs(false);
        } else {
            allErrors = [];
            filterLogs(false);
        }
    } catch (error) { 
        console.error("Error fetching system errors API:", error); 
    }
}

let systemBootTime = 0

function updateResourceColors(rawString, elementId){
     // this is to split the string to extract numbers for percentage calculation
    const parts = rawString.split(' / ');
    const usedStr = parts[0];
    const totalStr = parts[1];

    // uses parseFloat to extract the numbers from the strings
    const usedNum = parseFloat(usedStr);
    const totalNum = parseFloat(totalStr);
    
    // calculate percentage of ram to determine severity
    const percentage = (usedNum / totalNum) * 100;

    let severityClass = "status-safe";
    if (percentage >= 90) {
        severityClass = "status-critical";
    } else if (percentage >= 75) {
        severityClass = "status-warning";
    }

    document.getElementById(elementId).innerHTML = `<span class="${severityClass}">${usedStr}</span> / ${totalStr}`;
}

// fetch system specifications and display in the left panel, async so it doesn't block the initial page load
async function fetchSystemSpecs() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/system-specs');
        const specs = await response.json();

        // overrides the specs with real spec info from the API response
        document.getElementById('spec-os').innerText = specs.os;
        document.getElementById('spec-cpu').innerText = specs.cpu;
        document.getElementById('spec-gpu').innerText = specs.gpu;
        document.getElementById('spec-cores').innerText = specs.cores;

        updateResourceColors(specs.ram, 'spec-ram');
        updateResourceColors(specs.disk, 'spec-disk');

        systemBootTime = specs.boot_time;
    } catch (error){ 
        console.error("Error fetching system specs:", error); 
    }
}
// actively runs how long the system has been on for
function updateUptime() {
    if (systemBootTime === 0) return;
    const now = Date.now() / 1000; 
    const diff = now - systemBootTime; 
    
    const d = Math.floor(diff / (3600*24));
    const h = Math.floor((diff % (3600*24)) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = Math.floor(diff % 60);
    
    document.getElementById('spec-uptime').innerText = `${d}d ${h}h ${m}m ${s}s`;
}

setInterval(updateUptime, 1000);
loadChartHistory();
fetchSystemSpecs();
checkSystemErrors();
fetchLiveTelemetry(); 

// a continuous loop that calls Python every 2 seconds to fetch KPI usages, and 5 seconds to grab data to update the live chart
setInterval(fetchLiveFast, 2000)
setInterval(fetchLiveTelemetry, 5000); 
setInterval(checkSystemErrors, 10000);