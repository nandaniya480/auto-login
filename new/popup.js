const data = {
  "19/04/2025": ["10:00", "13:35", "14:35"],
};

const WORKDAY_MS = 8.5 * 60 * 60 * 1000;

const TEST_HH_MM = "19:30";
const USE_TEST_TIME = true;

const [testH, testM] = TEST_HH_MM.split(':').map(Number);
const now = new Date();
const TEST_TIME = new Date(now.getFullYear(), now.getMonth(), now.getDate(), testH, testM);

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


function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}


function updateTimeDisplay() {
  const now = getNow();
  const dateKey = now.toLocaleDateString("en-GB");
  const rawTimes = data[dateKey];

  if (!rawTimes) {
    document.getElementById("total-in").textContent = "N/A";
    document.getElementById("total-out").textContent = "N/A";
    document.getElementById("escape-time").textContent = "N/A";
    document.getElementById("remaining").textContent = "N/A";
    return;
  }

  let times = addBreak(rawTimes)

  times.sort((a, b) => toMinutes(a) - toMinutes(b));

  let totalInMs = 0;
  let totalOutMs = 0;
  let firstIn = null;

  for (let i = 0; i < times.length; i += 2) {
    const inTime = times[i];
    const outTime = times[i + 1] || getCurrentTimeStr(now);

    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);

    const inDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), inH, inM);
    const outDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), outH, outM);

    if (!firstIn) firstIn = inDate;

    let periodInMs = outDate - inDate;

    totalInMs += periodInMs;

    if (i + 2 < times.length) {
      const nextIn = times[i + 2];
      const [nH, nM] = nextIn.split(':').map(Number);
      const nextInDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nH, nM);
      totalOutMs += nextInDate - outDate;
    }
  }

  const escapeTime = new Date(firstIn.getTime() + WORKDAY_MS + totalOutMs);
  const remainingMs = Math.max(WORKDAY_MS - totalInMs, 0);

  document.getElementById("total-in").textContent = formatTimeReadable(totalInMs);
  document.getElementById("total-out").textContent = formatTimeReadable(totalOutMs);
  document.getElementById("escape-time").textContent = escapeTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  document.getElementById("remaining").textContent = formatTimeReadable(remainingMs);
  document.getElementById("refreshedAt").textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  console.log("Adjusted times:", times); // Debug output
}
function addBreak(rawTimes) {
  const mapped = [];

  // Step 1: Map raw times to {type, time}
  for (let i = 0; i < rawTimes.length; i++) {
    mapped.push({
      type: i % 2 === 0 ? 'in' : 'out',
      time: rawTimes[i],
    });
  }

  // Step 2: Define break times
  const breakOut = { type: 'out', time: '13:30' };
  const breakIn = { type: 'in', time: '14:30' };

  // Step 3: Insert break at correct position
  const toMinutes = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const breakOutMin = toMinutes(breakOut.time);
  const breakInMin = toMinutes(breakIn.time);

  // Insert breakOut at the correct position
  let insertedOut = false;
  let insertedIn = false;
  const result = [];

  for (let i = 0; i < mapped.length; i++) {
    const cur = mapped[i];
    const curMin = toMinutes(cur.time);

    // Insert breakOut before this time
    if (!insertedOut && curMin > breakOutMin) {
      result.push(breakOut);
      insertedOut = true;
    }

    // Insert breakIn before this time
    if (!insertedIn && curMin > breakInMin) {
      result.push(breakIn);
      insertedIn = true;
    }

    result.push(cur);
  }

  // If still not inserted (e.g. break is after all punches), push at the end
  if (!insertedOut) result.push(breakOut);
  if (!insertedIn) result.push(breakIn);

  alert(JSON.stringify(result, null, 2));
}


updateTimeDisplay();
setInterval(updateTimeDisplay, 1000);