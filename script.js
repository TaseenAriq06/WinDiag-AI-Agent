let sortDirection = 1; 
let currentSortColumn = '';
let allErrors = [];
let filteredErrors = []; 
let currentPage = 1;
const rowsPerPage = 10;
let activeErrorForAI = null; 

const moonIcon = `<svg style="width:18px;height:18px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
const sunIcon = `<svg style="width:18px;height:18px;margin-right:6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;

const themeToggleBtn = document.getElementById('themeToggle');

if(localStorage.getItem('theme') == 'dark'){
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = sunIcon + 'Light Mode';
} else {
    themeToggleBtn.innerHTML = moonIcon + 'Dark Mode';
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    if(document.body.classList.contains('dark-mode')){
        themeToggleBtn.innerHTML = sunIcon + 'Light Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggleBtn.innerHTML = moonIcon + 'Dark Mode';
        localStorage.setItem('theme', 'light');
    }
});

function filterLogs(resetPage = true) {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const selectedSeverity = document.getElementById('severityFilter').value;
    
    filteredErrors = allErrors.filter(error => {
        const textMatch = error.title.toLowerCase().includes(query) ||
                          error.provider.toLowerCase().includes(query) ||
                          error.event_id.toString().includes(query);
        const severityMatch = (selectedSeverity === 'all') || (error.severity === selectedSeverity);
        return textMatch && severityMatch;
    });
    
    if(resetPage == true){
        currentPage = 1;
    }
    renderTable();
}

window.sortLogs = function(column) {
    if (currentSortColumn === column) {
        sortDirection *= -1;
    } else {
        sortDirection = 1;
        currentSortColumn = column;
    }
    filteredErrors.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        if (column === 'event_id') return (valA - valB) * sortDirection;
        return valA.toString().localeCompare(valB.toString()) * sortDirection;
    });
    currentPage = 1; 
    renderTable();
};

window.exportToCSV = function() {
    if (filteredErrors.length === 0) {
        alert("No logs match your current filter. Nothing to export!");
        return;
    }

    const headers = ["Timestamp", "Event ID", "Severity", "Classification", "Provider", "Description"];
    
    const csvRows = filteredErrors.map(err => {
        const date = new Date(err.timestamp).toLocaleString('en-US');
        
        const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
        
        return [
            escapeCSV(date),
            err.event_id,
            escapeCSV(err.severity.toUpperCase()),
            escapeCSV(err.title),
            escapeCSV(err.provider),
            escapeCSV(err.description)
        ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `System_Diagnostic_Report_${today}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function getSeverityColors(severity) {
    if (severity === 'high') {
        return { bg: '#ef4444', text: '#ffffff', badgeBg: '#fee2e2', badgeText: '#b91c1c' }; 
    } else if (severity === 'medium') {
        return { bg: '#f97316', text: '#ffffff', badgeBg: '#ffedd5', badgeText: '#c2410c' }; 
    } else {
        return { bg: '#eab308', text: '#1f2937', badgeBg: '#fef9c3', badgeText: '#a16207' }; 
    }
}

const ctx = document.getElementById('telemetryChart').getContext('2d');
const telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'CPU Usage (%)', data: [], borderColor: '#2563eb', tension: 0.2, fill: false, yAxisID: 'y' },
            { label: 'RAM Usage (%)', data: [], borderColor: '#10b981', tension: 0.2, fill: false, yAxisID: 'y' },
            { label: 'GPU Usage (%)', data: [], borderColor: '#8b5cf6', tension: 0.2, fill: false, yAxisID: 'y' },
            { label: 'Network Speed (Mbps)', data: [], borderColor: '#f06e69', tension: 0.2, fill: false, yAxisID: 'y1' }
        ]
    },
    options: { 
        responsive: true, maintainAspectRatio: false, 
        scales: { 
            y: { type: 'linear', display: true, position: 'left', beginAtZero: true, max: 100, title: { display: true, text: 'Utilization (%)', color: '#6b7280' } },
            y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Network (Mbps)', color: '#f06e69' }, grid: { drawOnChartArea: false } } 
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
        aiBtn.innerText = 'Ask AI For Recommendation';
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
            const latestError = result.errors[0];
            const alertBanner = document.getElementById('alertBanner');
            const alertText = document.getElementById('alertText');
            
            const bannerDate = new Date(latestError.timestamp);
            const cleanBannerTime = bannerDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
            const colors = getSeverityColors(latestError.severity);
            
            alertBanner.style.backgroundColor = colors.bg;
            alertBanner.style.color = colors.text;

            const now = new Date();
            const hoursDifference = Math.abs(now - bannerDate) / 36e5; 

            if (hoursDifference < 24) {
                alertText.innerHTML = `
                    <strong>⚠️ ${latestError.title}</strong><br>
                    <em>${cleanBannerTime}</em><br><br>
                    ${latestError.description}<br>
                    <strong>Recommended Action:</strong> ${latestError.action}
                `;
                alertBanner.style.display = 'block';
            } else {
                alertBanner.style.display = 'none';
            }
            
            allErrors = result.errors;
            filterLogs(false); 
        } else {
            allErrors = [];
            filterLogs(false);
        }
    } catch (error) { console.error("Error fetching system errors API:", error); }
}

let systemBootTime = 0

async function fetchSystemSpecs() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/system-specs');
        const specs = await response.json();
        document.getElementById('spec-os').innerText = specs.os;
        document.getElementById('spec-cpu').innerText = specs.cpu;
        document.getElementById('spec-gpu').innerText = specs.gpu;
        document.getElementById('spec-cores').innerText = specs.cores;
        document.getElementById('spec-ram').innerText = specs.ram;
        document.getElementById('spec-disk').innerText = specs.disk;
        
        systemBootTime = specs.boot_time;
    } catch (error) { console.error("Error fetching system specs:", error); }
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

setInterval(fetchLiveFast, 2000)
setInterval(fetchLiveTelemetry, 15000); 
setInterval(checkSystemErrors, 10000);