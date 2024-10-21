let globalData = null;
let currentDomain = null;
let chart = null;

document.addEventListener('DOMContentLoaded', () => {
    const timeRangeSelect = document.getElementById('timeRange');
    timeRangeSelect.addEventListener('change', updateDisplay);
    updateDisplay();
});

async function updateDisplay() {
    const timeRange = document.getElementById('timeRange').value;
    globalData = await chrome.storage.local.get(null);
    const timeList = document.getElementById('timeList');
    timeList.innerHTML = '';

    const sortedDomains = Object.keys(globalData).sort((a, b) =>
        getTotalTime(globalData[b], timeRange) - getTotalTime(globalData[a], timeRange)
    );

    const chartData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: []
        }]
    };

    for (const domain of sortedDomains) {
        const totalTime = getTotalTime(globalData[domain], timeRange);
        if (totalTime > 0) {
            const listItem = createListItem(domain, totalTime, timeRange);
            timeList.appendChild(listItem);

            // Add data for the chart
            chartData.labels.push(domain);
            chartData.datasets[0].data.push(totalTime / (1000 * 60 * 60)); // Convert to hours
            chartData.datasets[0].backgroundColor.push(getRandomColor());
        }
    }

    updateChart(chartData);

    // Get current tab's domain
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentDomain = new URL(tabs[0].url).hostname;
        }
    });

    // Start real-time updates
    updateRealTimeData();
}

function createListItem(domain, totalTime, timeRange) {
    const li = document.createElement('div');
    li.className = 'flex items-center justify-between gap-10 p-4 bg-gray-50 rounded-lg transition duration-300 ease-in-out hover:bg-gray-100';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'flex items-center space-x-3';

    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    favicon.className = 'w-6 h-6';
    leftDiv.appendChild(favicon);

    const domainSpan = document.createElement('span');
    domainSpan.textContent = domain;
    domainSpan.className = 'text-gray-700 font-medium';
    leftDiv.appendChild(domainSpan);

    li.appendChild(leftDiv);

    const rightDiv = document.createElement('div');
    rightDiv.className = 'flex items-center space-x-2';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'time-display text-gray-900 font-semibold mr-2';
    timeSpan.dataset.domain = domain;
    timeSpan.textContent = formatTime(totalTime);
    rightDiv.appendChild(timeSpan);

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    resetButton.className = 'bg-yellow-500 text-white px-2 py-1 rounded text-xs';
    resetButton.addEventListener('click', () => resetData(domain, timeRange));
    rightDiv.appendChild(resetButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'bg-red-500 text-white px-2 py-1 rounded text-xs';
    deleteButton.addEventListener('click', () => deleteData(domain));
    rightDiv.appendChild(deleteButton);

    li.appendChild(rightDiv);

    return li;
}

async function resetData(domain, timeRange) {
    if (confirm(`Are you sure you want to reset the data for ${domain}?`)) {
        const data = await chrome.storage.local.get(domain);
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        if (timeRange === 'day') {
            data[domain][today] = 0;
        } else if (timeRange === 'week') {
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                if (data[domain][dateStr]) {
                    data[domain][dateStr] = 0;
                }
            }
        } else if (timeRange === 'month') {
            for (let i = 0; i < 30; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                if (data[domain][dateStr]) {
                    data[domain][dateStr] = 0;
                }
            }
        }

        await chrome.storage.local.set(data);
        updateDisplay();
    }
}

async function deleteData(domain) {
    if (confirm(`Are you sure you want to delete all data for ${domain}?`)) {
        await chrome.storage.local.remove(domain);
        updateDisplay();
    }
}

function updateChart(data) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Time Distribution'
                }
            }
        }
    });
}

function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function getTotalTime(domainData, timeRange) {
    const now = new Date();
    let total = 0;
    for (const [date, time] of Object.entries(domainData)) {
        const entryDate = new Date(date);
        if (
            (timeRange === 'day' && isSameDay(now, entryDate)) ||
            (timeRange === 'week' && isSameWeek(now, entryDate)) ||
            (timeRange === 'month' && isSameMonth(now, entryDate))
        ) {
            total += time;
        }
    }
    return total;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function isSameWeek(d1, d2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDayOfWeek = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate() - d1.getDay());
    return Math.abs((d2 - firstDayOfWeek) / oneDay) < 7;
}

function isSameMonth(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth();
}

function updateRealTimeData() {
    chrome.runtime.sendMessage({ action: "getCurrentTabTime" }, (response) => {
        if (response) {
            const { currentTabTime, productivityScore } = response;
            const timeRange = document.getElementById('timeRange').value;
            const timeDisplays = document.querySelectorAll('.time-display');

            timeDisplays.forEach(display => {
                const domain = display.dataset.domain;
                let totalTime = getTotalTime(globalData[domain], timeRange);

                if (domain === currentDomain) {
                    totalTime += currentTabTime;
                }

                display.textContent = formatTime(totalTime);
            });

            const productivityScoreElement = document.getElementById('productivityScore');
            productivityScoreElement.textContent = `Productivity Score: ${productivityScore}`;
        }

        // Schedule the next update
        setTimeout(updateRealTimeData, 1000);
    });
}