// Constants
const WORKDAY_MS = 8.5 * 60 * 60 * 1000;
const TEST_HH_MM = "19:55";
const USE_TEST_TIME = false;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const timeDisplay = document.getElementById('timeDisplay');
const userIdInput = document.getElementById('userIdInput');
const passwordInput = document.getElementById('passwordInput');
const saveCredsButton = document.getElementById('saveCreds');
const refreshButton = document.getElementById('refreshButton');

// Function to trigger login process
function triggerLogin(userId, password) {
  chrome.runtime.sendMessage({
    action: "openAndScrape",
    userId: userId,
    password: password
  });
}

// Check if credentials exist on popup open
chrome.storage.local.get(['userId', 'password','timeData'], (result) => {
  if (result.userId && result.password) {
    // Credentials exist, show time display
    loginForm.style.display = 'none';
    timeDisplay.style.display = 'block';

  } else {
    // No credentials, show login form
    loginForm.style.display = 'block';
    timeDisplay.style.display = 'none';
  }
});

// Save credentials and trigger login
saveCredsButton.addEventListener('click', () => {
  const userId = userIdInput.value.trim();
  const password = passwordInput.value.trim();

  if (userId && password) {
    chrome.storage.local.set({ userId, password }, () => {
      // Show success message
      saveCredsButton.textContent = 'Saved!';
      saveCredsButton.style.backgroundColor = '#27ae60';

      // Trigger login process
      triggerLogin(userId, password);

      // Switch to time display after a short delay
      setTimeout(() => {
        loginForm.style.display = 'none';
        timeDisplay.style.display = 'block';
        updateTimeDisplay();
        refreshButton.textContent = 'Loading...';
        refreshButton.disabled = true;
        refreshButton.style.backgroundColor = '#95a5a6';
      }, 1000);
    });
  } else {
    saveCredsButton.textContent = 'Please fill both fields';
    saveCredsButton.style.backgroundColor = '#e74c3c';
    setTimeout(() => {
      saveCredsButton.textContent = 'Save & Login';
      saveCredsButton.style.backgroundColor = '#2ecc71';
    }, 2000);
  }
});

// Add refresh button event listener
refreshButton.addEventListener('click', () => {
  // Clear existing timeData
  chrome.storage.local.remove(['timeData'], () => {
    // Get stored credentials and trigger login
    chrome.storage.local.get(['userId', 'password'], (result) => {
      if (result.userId && result.password) {
        triggerLogin(result.userId, result.password);
        // Update the display
        updateTimeDisplay();
      }    
    });
  });
});

// Helpers
const [testH, testM] = TEST_HH_MM.split(':').map(Number);
const today = new Date();
const TEST_TIME = new Date(today.getFullYear(), today.getMonth(), today.getDate(), testH, testM);

function getNow() {
  return USE_TEST_TIME ? new Date(TEST_TIME) : new Date();
}

function getCurrentTimeStr(now = getNow()) {
  return now.toTimeString().slice(0, 5);
}

function formatTimeReadable(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function createTimeObj(timeStr, refDate) {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), h, m);
}

// Main Display Update
function updateTimeDisplay() {
  chrome.storage.local.get(null, (result) => {
    const data = result.timeData || {};
    const now = getNow();
    const dateKey = now.toLocaleDateString("en-GB");
    const rawTimes = data[dateKey];

    refreshButton.textContent = 'Loading...';
    refreshButton.disabled = true;
    refreshButton.style.backgroundColor = '#95a5a6';

    if (!rawTimes || rawTimes.length === 0) {
      updateUI("N/A", "N/A", "N/A", "N/A", now);
      return;
    }

    // const times = addBreak(rawTimes);
    const times = rawTimes;

    let totalInMs = 0;
    let totalOutMs = 0;
    let firstIn = null;

    for (let i = 0; i < times.length; i += 2) {
      const inTime = times[i];
      const outTime = times[i + 1] || getCurrentTimeStr(now);

      const inDate = createTimeObj(inTime, now);
      const outDate = createTimeObj(outTime, now);

      if (!firstIn) firstIn = inDate;
      totalInMs += outDate - inDate;

      if (i + 2 < times.length) {
        const nextInDate = createTimeObj(times[i + 2], now);
        totalOutMs += nextInDate - outDate;
      }
    }


    const targetHour = 13;
    const targetMinute = 30;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    let escapeTime;
    if (now.getHours() < targetHour || (now.getHours() === targetHour && now.getMinutes() < targetMinute)) {
      escapeTime = new Date(firstIn.getTime() + WORKDAY_MS + totalOutMs + ONE_HOUR_MS);
    } else {
      escapeTime = new Date(firstIn.getTime() + WORKDAY_MS + totalOutMs);
    }

    const remainingMs = Math.max(WORKDAY_MS - totalInMs, 0);

    updateUI(
      formatTimeReadable(totalInMs),
      formatTimeReadable(totalOutMs),
      escapeTime,
      formatTimeReadable(remainingMs),
      now
    );

    refreshButton.textContent = 'Refresh';
    refreshButton.disabled = false;
    refreshButton.style.backgroundColor = '#2ecc71';

  });
}

// UI Update
function updateUI(totalIn, totalOut, escapeTime, remaining, now) {
  document.getElementById("total-in").textContent = totalIn;
  document.getElementById("total-out").textContent = totalOut;
  document.getElementById("escape-time").textContent = new Date(escapeTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  document.getElementById("refreshedAt").textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  document.getElementById("remaining").textContent = remaining;
}

// Start Auto Update
updateTimeDisplay();
setInterval(updateTimeDisplay, 1000);
