document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('addProductiveSite').addEventListener('click', () => addSite('productive'));
    document.getElementById('addUnproductiveSite').addEventListener('click', () => addSite('unproductive'));
    document.getElementById('addTimeGoal').addEventListener('click', addTimeGoal);
});

async function loadSettings() {
    const { productiveSites = [], unproductiveSites = [], timeGoals = {} } = await chrome.storage.sync.get(['productiveSites', 'unproductiveSites', 'timeGoals']);

    displaySites('productive', productiveSites);
    displaySites('unproductive', unproductiveSites);
    displayTimeGoals(timeGoals);
}

function displaySites(type, sites) {
    const list = document.getElementById(`${type}SiteList`);
    list.innerHTML = '';
    sites.forEach(site => {
        const li = document.createElement('li');
        li.textContent = site;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'ml-2 text-red-500';
        deleteBtn.addEventListener('click', () => deleteSite(type, site));
        li.appendChild(deleteBtn);
        list.appendChild(li);
    });
}

function displayTimeGoals(timeGoals) {
    const list = document.getElementById('timeGoalList');
    list.innerHTML = '';
    Object.entries(timeGoals).forEach(([site, minutes]) => {
        const li = document.createElement('li');
        li.textContent = `${site}: ${minutes} minutes`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'ml-2 text-red-500';
        deleteBtn.addEventListener('click', () => deleteTimeGoal(site));
        li.appendChild(deleteBtn);
        list.appendChild(li);
    });
}

async function addSite(type) {
    const input = document.getElementById(`${type}Site`);
    const site = input.value.trim();
    if (site) {
        const { [type + 'Sites']: sites = [] } = await chrome.storage.sync.get(type + 'Sites');
        if (!sites.includes(site)) {
            sites.push(site);
            await chrome.storage.sync.set({ [type + 'Sites']: sites });
            displaySites(type, sites);
            input.value = '';
        }
    }
}

async function deleteSite(type, site) {
    const { [type + 'Sites']: sites = [] } = await chrome.storage.sync.get(type + 'Sites');
    const updatedSites = sites.filter(s => s !== site);
    await chrome.storage.sync.set({ [type + 'Sites']: updatedSites });
    displaySites(type, updatedSites);
}

async function addTimeGoal() {
    const siteInput = document.getElementById('timeGoalSite');
    const minutesInput = document.getElementById('timeGoalMinutes');
    const site = siteInput.value.trim();
    const minutes = parseInt(minutesInput.value);

    if (site && !isNaN(minutes) && minutes > 0) {
        const { timeGoals = {} } = await chrome.storage.sync.get('timeGoals');
        timeGoals[site] = minutes;
        await chrome.storage.sync.set({ timeGoals });
        displayTimeGoals(timeGoals);
        siteInput.value = '';
        minutesInput.value = '';
    }
}

async function deleteTimeGoal(site) {
    const { timeGoals = {} } = await chrome.storage.sync.get('timeGoals');
    delete timeGoals[site];
    await chrome.storage.sync.set({ timeGoals });
    displayTimeGoals(timeGoals);
}