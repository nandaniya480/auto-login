// Constants
const WORKDAY_MS = 8.5 * 60 * 60 * 1000;
const WEEKLY_TARGET_MS = 42.5 * 60 * 60 * 1000;
const TEST_HH_MM = "19:24";
const USE_TEST_TIME = false;
const today = new Date();
const now = getNow();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const timeDisplay = document.getElementById('timeDisplay');
const userIdInput = document.getElementById('userIdInput');
const passwordInput = document.getElementById('passwordInput');
const saveCredsButton = document.getElementById('saveCreds');
const refreshButton = document.getElementById('refreshButton');
const errorBox = document.getElementById('errorBox');


const container = document.getElementById("analogClock");
const totalHours = 8.5;
const totalDegrees = 30 * totalHours;
const centerX = 50;
const centerY = 50;
const radius = 40;

for (let i = 1; i <= totalHours; i++) {
  const hour = i;
  const number = document.createElement("div");
  number.className = "hour-number";
  number.innerText = hour;

  const angle = ((hour - 1) / (totalHours - 1)) * totalDegrees;
  const angleRad = (angle - totalDegrees) * (Math.PI / 136);

  const x = centerX + radius * Math.sin(angleRad) - 10;
  const y = centerY - radius * Math.cos(angleRad) - 10;

  number.style.left = `${x}px`;
  number.style.top = `${y}px`;
  container.appendChild(number);
}

// Show error
function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

// Hide error
function hideError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

// Time helpers
function getNow() {
  const [testH, testM] = TEST_HH_MM.split(':').map(Number);
  const testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), testH, testM);
  return USE_TEST_TIME ? testDate : new Date();
}

function getCurrentTimeStr(now = getNow()) {
  return now.toTimeString().slice(0, 5);
}

function formatTimeReadable(ms) {
  const isNegative = ms < 0;
  ms = Math.abs(ms);
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const formatted = `${hours}h ${minutes}m`;
  return isNegative ? `-${formatted}` : formatted;
}

function createTimeObj(timeStr, refDate) {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), h, m);
}

// Initial toggle UI
chrome.storage.local.get(['userId', 'password', 'timeData'], (result) => {
  if (result.userId && result.password) {
    loginForm.style.display = 'none';
    timeDisplay.style.display = 'block';
  } else {
    loginForm.style.display = 'block';
    timeDisplay.style.display = 'none';
  }
});

// Save & Login
saveCredsButton.addEventListener('click', () => {
  const userId = userIdInput.value.trim();
  const password = passwordInput.value.trim();
  hideError();

  if (userId && password) {
    chrome.storage.local.set({ userId, password }, () => {
      saveCredsButton.textContent = 'Saved!';
      saveCredsButton.style.backgroundColor = '#27ae60';
      triggerLogin(userId, password);
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
    showError('Please fill both User ID and Password');
    saveCredsButton.textContent = 'Please fill both fields';
    saveCredsButton.style.backgroundColor = '#e74c3c';
    setTimeout(() => {
      saveCredsButton.textContent = 'Save & Login';
      saveCredsButton.style.backgroundColor = '#2ecc71';
    }, 2000);
  }
});

// Manual refresh
refreshButton.addEventListener('click', () => {
  chrome.storage.local.get(['timeData', 'userId', 'password'], (result) => {
    const timeData = result.timeData || {};
    const todayKey = today.toLocaleDateString("en-GB");
    delete timeData[todayKey];

    chrome.storage.local.set({ timeData }, () => {
      if (result.userId && result.password) {
        hideError();
        triggerLogin(result.userId, result.password);
        refreshButton.textContent = 'Loading...';
        refreshButton.disabled = true;
        refreshButton.style.backgroundColor = '#95a5a6';
        updateTimeDisplay();
      } else {
        showError('Stored credentials not found.');
      }
    });
  });
});

// Trigger background scrape
function triggerLogin(userId, password) {
  chrome.runtime.sendMessage({
    action: "openAndScrape",
    userId,
    password
  }, (response) => {
    if (response && response.error) {
      showError(response.error);
    }
  });
}

// Main update function
function updateTimeDisplay() {
  chrome.storage.local.get(null, (result) => {
    const data = result.timeData || {};
    const now = getNow();
    const dateKey = now.toLocaleDateString("en-GB");
    const rawTimes = data[dateKey];

    if (!rawTimes || rawTimes.length === 0) {
      updateUI("N/A", "N/A", "N/A", "N/A", now, 0, WEEKLY_TARGET_MS);
      return;
    }

    let totalInMs = 0;
    let totalOutMs = 0;
    let firstIn = null;

    for (let i = 0; i < rawTimes.length; i += 2) {
      const inTime = rawTimes[i];
      const outTime = rawTimes[i + 1] || getCurrentTimeStr(now);

      const inDate = createTimeObj(inTime, now);
      const outDate = createTimeObj(outTime, now);

      if (!firstIn) firstIn = inDate;
      totalInMs += outDate - inDate;

      if (i + 2 < rawTimes.length) {
        const nextInDate = createTimeObj(rawTimes[i + 2], now);
        totalOutMs += nextInDate - outDate;
      }
    }

    const ONE_HOUR_MS = 60 * 60 * 1000;
    let escapeTime = new Date(firstIn?.getTime() + WORKDAY_MS + totalOutMs || now);
    if (now.getHours() < 13 || (now.getHours() === 13 && now.getMinutes() < 30)) {
      escapeTime = new Date(escapeTime.getTime() + ONE_HOUR_MS);
    }

    const remainingMs = Math.max(WORKDAY_MS - totalInMs, 0);

    // Weekly total
    let weekTotalInMs = 0;
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    for (const key in data) {
      const [dd, mm, yyyy] = key.split('/');
      const entryDate = new Date(`${yyyy}-${mm}-${dd}`);
      entryDate.setHours(0, 0, 0, 0);

      const isWeekday = entryDate.getDay() >= 1 && entryDate.getDay() <= 6;
      if (isWeekday && entryDate >= monday && entryDate <= now) {
        const entries = data[key];
        for (let i = 0; i < entries.length; i += 2) {
          const inDate = createTimeObj(entries[i], entryDate);
          const outDate = createTimeObj(entries[i + 1] || getCurrentTimeStr(), entryDate);
          weekTotalInMs += outDate - inDate;
        }
      }
    }

    let pastDaysLength = 0;
    for (let d = new Date(monday); d <= now; d.setDate(d.getDate() + 1)) {
      if (d.getDay() >= 1 && d.getDay() <= 5) pastDaysLength++;
    }

    const todayKey = now.toLocaleDateString("en-GB");
    let todayInMs = 0;

    if (data[todayKey]) {
      const times = data[todayKey];
      for (let i = 0; i < times.length; i += 2) {
        const inDate = createTimeObj(times[i], now);
        const outDate = createTimeObj(times[i + 1] || getCurrentTimeStr(now), now);
        todayInMs += outDate - inDate;
      }
    }

    const expectedTotalMs = WORKDAY_MS * (pastDaysLength - 1) + Math.min(todayInMs, WORKDAY_MS);
    const weeklyDiff = weekTotalInMs - expectedTotalMs;
    const weekRemainingMs = Math.max(WEEKLY_TARGET_MS - weekTotalInMs, 0);

    updateUI(
      formatTimeReadable(totalInMs),
      formatTimeReadable(totalOutMs),
      escapeTime,
      formatTimeReadable(remainingMs),
      now,
      weekTotalInMs,
      weekRemainingMs,
      weeklyDiff
    );
    const minutes = totalInMs / (60 * 1000);

    updateWorkClock(minutes);

    refreshButton.textContent = 'Refresh';
    refreshButton.disabled = false;
    refreshButton.style.backgroundColor = '#2ecc71';
  });
}

function updateUI(totalIn, totalOut, escapeTime, remaining, now, weekTotalInMs, weekRemainingMs, weeklyDiff) {
  document.getElementById("total-in").textContent = totalIn;
  document.getElementById("total-out").textContent = totalOut;
  document.getElementById("escape-time").textContent = new Date(escapeTime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  // document.getElementById("refreshedAt").textContent = now.toLocaleTimeString([], {
  //   hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  // });
  document.getElementById("remaining").textContent = remaining;
  document.getElementById("week-total-in").textContent = formatTimeReadable(weekTotalInMs);
  let weeklyDiffText = "";
  if (weeklyDiff > 0) {
    weeklyDiffText = `▲ ${formatTimeReadable(weeklyDiff)}`;
  } else if (weeklyDiff < 0) {
    weeklyDiffText = `▼ ${formatTimeReadable(weeklyDiff)}`;
  } else {
    weeklyDiffText = formatTimeReadable(weeklyDiff);
  }
  document.getElementById("week-diff").textContent = weeklyDiffText
  document.getElementById("week-remaining").textContent = formatTimeReadable(weekRemainingMs);
}

function updateWorkClock(totalIn) {
  const now = getNow();
  const maxMinutes = 8.5 * 60;
  const secDeg = now.getSeconds() * 6;

  const hourHand = document.querySelector('.hand.hour');
  const minuteHand = document.querySelector('.hand.minute');
  const secondHand = document.querySelector('.hand.second');

  if (totalIn > maxMinutes) {
    const extraDeg = ((totalIn - maxMinutes) / 60) * 360;
    hourHand.style.display = 'none';
    minuteHand.style.display = 'block';
    minuteHand.style.backgroundColor = '#27ae60';
    minuteHand.style.transform = `translateX(-50%) rotate(${extraDeg}deg)`;
  } else {
    const hourDeg = (totalIn / maxMinutes) * 360;
    hourHand.style.display = 'block';
    hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    minuteHand.style.display = 'none';
    minuteHand.style.backgroundColor = '';
    minuteHand.style.transform = `translateX(-50%) rotate(0deg)`;
  }
  secondHand.style.transform = `translateX(-50%) rotate(${secDeg}deg)`;
}

// Initial call and auto-update every second
updateTimeDisplay();
setInterval(updateTimeDisplay, 1000);
