let currentTab = null;
let startTime = null;
let productivityScore = 100;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateTimeForTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        updateTimeForTab(tab);
    }
});

function getDomain(url) {
    try {
        const urlObject = new URL(url);
        return urlObject.hostname;
    } catch (e) {
        console.warn("Invalid URL:", url);
        return "unknown";
    }
}

async function updateTimeForTab(tab) {
    const now = Date.now();
    if (currentTab && currentTab.url) {
        const domain = getDomain(currentTab.url);
        const timeSpent = now - startTime;
        await updateStorage(domain, timeSpent);
        updateProductivityScore(domain, timeSpent);
    }
    currentTab = tab;
    startTime = now;
    if (tab.url) {
        checkTimeGoals(tab.url);
    }
}

async function updateStorage(domain, timeSpent) {
    const data = await chrome.storage.local.get(domain);
    const today = new Date().toISOString().split('T')[0];
    if (!data[domain]) {
        data[domain] = {};
    }
    if (!data[domain][today]) {
        data[domain][today] = 0;
    }
    data[domain][today] += timeSpent;
    await chrome.storage.local.set(data);
}

async function updateProductivityScore(domain, timeSpent) {
    const { productiveSites = [], unproductiveSites = [] } = await chrome.storage.sync.get(['productiveSites', 'unproductiveSites']);
    if (productiveSites.includes(domain)) {
        productivityScore = Math.min(100, productivityScore + 1);
    } else if (unproductiveSites.includes(domain)) {
        productivityScore = Math.max(0, productivityScore - 1);
    }
}

async function checkTimeGoals(url) {
    const domain = getDomain(url);
    const { timeGoals = {} } = await chrome.storage.sync.get('timeGoals');
    if (timeGoals[domain]) {
        const data = await chrome.storage.local.get(domain);
        const today = new Date().toISOString().split('T')[0];
        const timeSpent = data[domain]?.[today] || 0;
        if (timeSpent >= timeGoals[domain] * 60 * 1000) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon128.png',
                title: 'Time Goal Reached',
                message: `You've reached your daily time goal for ${domain}!`
            });
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCurrentTabTime") {
        const currentTabTime = currentTab && currentTab.url ? Date.now() - startTime : 0;
        sendResponse({ currentTabTime, productivityScore });
    }
});

// Set up daily reset for productivity score
chrome.alarms.create('dailyReset', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyReset') {
        productivityScore = 100;
    }
});