// Constants
const WORKDAY_MS = 8.5 * 60 * 60 * 1000;
const TEST_HH_MM = "19:55";
const USE_TEST_TIME = false;

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

    const escapeTime = new Date(firstIn.getTime() + WORKDAY_MS + totalOutMs);
    const remainingMs = Math.max(WORKDAY_MS - totalInMs, 0);

    updateUI(
      formatTimeReadable(totalInMs),
      formatTimeReadable(totalOutMs),
      escapeTime,
      formatTimeReadable(remainingMs),
      now
    );
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
