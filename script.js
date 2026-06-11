// these are global variables that every function can read and write to, 'let' can be change but 'const' cant
let sortDirection = 1; 
let currentSortColumn = '';
let allErrors = [];
let filteredErrors = []; 
let currentPage = 1;
const rowsPerPage = 10;
let activeErrorForAI = null; 

const moonIcon = `<svg style="width:18px;height:18px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
const sunIcon = `<svg style="width:18px;height:18px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;

// save a variable by getting the element themeToggle from the document as a button variable 
const themeToggleBtn = document.getElementById('themeToggle');

// localStorage stores the user's preference if they originally had dark mode or light mode and forces <body> to set the preference
if(localStorage.getItem('theme') == 'dark'){
    // targets the main body of HTML file, tells the browser to add the word 'dark-mode' as a class list to use CSS attributes defined
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = sunIcon + 'Light Mode';
} else {
    themeToggleBtn.innerHTML = moonIcon + 'Dark Mode';
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
    // finds your search bar and grabs what the user typed, make it strictly lowercase for easy searches
    const query = document.getElementById('searchInput').value.toLowerCase();
    // finds the dropdown menu and and grabs the currently selected option
    const selectedSeverity = document.getElementById('severityFilter').value;
    
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
    const summaryBox = document.getElementById('healthSummaryBox')

    summaryBox.style.display = 'block';
    summaryBox.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Analyzing 24-hour telemetry vault...</span>';

    try {
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
    try {
        const response = await fetch('http://127.0.0.1:8000/api/history');
        const result = await response.json();
        result.telemetry.forEach(row => {
            const timeLabel = row.timestamp.slice(-8);
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
    try {
        const response = await fetch('http://127.0.0.1:8000/api/live/fast', { cache: 'no-store' });
        const data = await response.json();
        document.getElementById('live-val-cpu').innerText = data.cpu.toFixed(1);
        document.getElementById('live-val-ram').innerText = data.ram.toFixed(1);
        document.getElementById('live-val-gpu').innerText = data.gpu.toFixed(1);
        document.getElementById('live-val-net').innerText = data.wifi_mbps.toFixed(2);
    } catch(e) {}
}

async function fetchLiveTelemetry() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/live', { cache: 'no-store' });
        const data = await response.json();
        
        document.getElementById('live-val-cpu').innerText = data.cpu.toFixed(1);
        document.getElementById('live-val-ram').innerText = data.ram.toFixed(1);
        document.getElementById('live-val-gpu').innerText = data.gpu.toFixed(1);
        document.getElementById('live-val-net').innerText = data.wifi_mbps.toFixed(2);

        const processBox = document.getElementById('processList');
        processBox.innerHTML = ''; 

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

        const networkBox = document.getElementById('networkList');
        networkBox.innerHTML = ''; 

        if (data.top_connections.length === 0) {
            networkBox.innerHTML = '<div style="color: var(--text-muted); padding: 8px;">No active connections found.</div>';
        } else {
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

        telemetryChart.data.labels.push(data.timestamp);
        telemetryChart.data.datasets[0].data.push(data.cpu);
        telemetryChart.data.datasets[1].data.push(data.ram);
        telemetryChart.data.datasets[2].data.push(data.gpu);
        telemetryChart.data.datasets[3].data.push(data.wifi_mbps);
        
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
    const error = filteredErrors[globalIndex];
    if (!error) return;
    
    activeErrorForAI = error; 
    
    const aiBtn = document.getElementById('aiBtn');
    const responseContainer = document.getElementById('aiResponseContainer');
    const responseText = document.getElementById('aiResponseText');

    const safeProvider = String(error.provider).replace(/[^a-zA-Z0-9]/g, '_');
    const cacheKey = `gemini_cache_${error.event_id}_${safeProvider}`;
    const cachedAnalysis = localStorage.getItem(cacheKey);

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

    const rowDate = new Date(error.timestamp);
    const cleanRowTime = rowDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    const colors = getSeverityColors(error.severity);

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

window.closeModal = function(event) {
    if (!event || event.target.className === 'modal-overlay') {
        document.getElementById('logModal').style.display = 'none';
    }
}

window.askGemini = async function() {
    if (!activeErrorForAI) return;

    const aiBtn = document.getElementById('aiBtn');
    const responseContainer = document.getElementById('aiResponseContainer');
    const responseText = document.getElementById('aiResponseText');

    const safeProvider = String(activeErrorForAI.provider).replace(/[^a-zA-Z0-9]/g, '_');
    const cacheKey = `gemini_cache_${activeErrorForAI.event_id}_${safeProvider}`;

    aiBtn.disabled = true;
    aiBtn.innerText = 'Consulting Kernel Experts (Loading)...';
    responseContainer.style.display = 'block';
    responseText.innerHTML = '<em>Analyzing logs and checking system components...</em>';

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
        
        if (response.ok) { 
            localStorage.setItem(cacheKey, data.analysis);
            responseText.innerHTML = marked.parse(data.analysis);
            aiBtn.innerText = 'Analysis Complete';
        } else { 
            responseText.innerHTML = `<span style="color: red;">Error: ${data.detail || 'Failed to generate analysis.'}</span>`;
            aiBtn.disabled = false;
            aiBtn.innerText = '❌ Try Again';
        }
    } catch (error) { 
        console.error("AI API Error:", error);
        responseText.innerHTML = '<span style="color: red;">Failed to connect to local server endpoint. Make sure the API is running.</span>';
        aiBtn.disabled = false;
        aiBtn.innerText = '❌ Try Again';
    }
}

function renderTable() {
    const tableBody = document.getElementById('logTableBody');
    tableBody.innerHTML = ''; 
    
    if (filteredErrors.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No system logs match your filters.</td></tr>`;
        document.getElementById('pageIndicator').innerText = `of 1`;
        document.getElementById('pageInput').value = 1;
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        return;
    }
    
    const totalPages = Math.ceil(filteredErrors.length / rowsPerPage);
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentErrors = filteredErrors.slice(startIndex, endIndex);

    currentErrors.forEach((error, index) => {
        const globalIndex = startIndex + index; 
        const rowDate = new Date(error.timestamp);
        const cleanRowTime = rowDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        const rowColors = getSeverityColors(error.severity);
        
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
    document.getElementById('prevBtn').disabled = (currentPage === 1);
    document.getElementById('nextBtn').disabled = (currentPage === totalPages);
}

window.changePage = function(direction) {
    currentPage += direction;
    renderTable();
};

window.goToPage = function() {
    const pageInput = document.getElementById('pageInput');
    let targetPage = parseInt(pageInput.value);
    const totalPages = Math.ceil(filteredErrors.length / rowsPerPage) || 1;
    
    if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
    else if (targetPage > totalPages) targetPage = totalPages;
    
    currentPage = targetPage;
    renderTable();
};

async function checkSystemErrors() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/errors', { cache: 'no-store' });
        const result = await response.json();
        
        if (result.count > 0) {
            allErrors = result.errors;
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
        document.getElementById('spec-ram').innerText = specs.ram;
        document.getElementById('spec-disk').innerText = specs.disk;
        
        systemBootTime = specs.boot_time;
    } catch (error){ 
        console.error("Error fetching system specs:", error); 
    }
}

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

// a continuous loop that calls Python every 2 seconds to fetch KPI usages, and 15 seconds to grab data to update the live chart
setInterval(fetchLiveFast, 2000)
setInterval(fetchLiveTelemetry, 15000); 
setInterval(checkSystemErrors, 10000);