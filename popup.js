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

    const times = addBreak(rawTimes);

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

// Break Logic
function addBreak(rawTimes) {
  const breakStart = "13:30";
  const breakEnd = "14:30";
  const breakStartMin = toMinutes("13:31");
  const breakEndMin = toMinutes("14:29");

  const punches = rawTimes.map((t, i) => ({
    type: i % 2 === 0 ? 'in' : 'out',
    time: t
  }));

  const statusAtBreakStart = getStatusAtTime(punches, breakStartMin);
  const statusAtBreakEnd = getStatusAtTime(punches, breakEndMin);

  const filtered = punches.filter(p => {
    const timeMin = toMinutes(p.time);
    return timeMin < breakStartMin || timeMin > breakEndMin;
  });

  if (statusAtBreakStart === 'in' && statusAtBreakEnd === 'in') {
    filtered.push({ type: 'out', time: breakStart });
    filtered.push({ type: 'in', time: breakEnd });
  } else if (statusAtBreakStart === 'in' && statusAtBreakEnd === 'out') {
    filtered.push({ type: 'out', time: breakStart });
  } else if (statusAtBreakStart === 'out' && statusAtBreakEnd === 'in') {
    filtered.push({ type: 'in', time: breakEnd });
  }

  filtered.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  return filtered.map(p => p.time);
}

function getStatusAtTime(punches, targetMin) {
  let status = 'out';
  for (const punch of punches) {
    const timeMin = toMinutes(punch.time);
    if (timeMin > targetMin) break;
    status = status === 'in' ? 'out' : 'in';
  }
  return status;
}

// Start Auto Update
updateTimeDisplay();
setInterval(updateTimeDisplay, 1000);
