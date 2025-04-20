const data = {
  "19/04/2025": ["10:00", "13:35", "14:35"], // example punches
};
// "19/04/2025": ["10:00","13:30","13:35","13:35","14:30", "14:35"]
                    // i     o         i       o       i       o
const WORKDAY_MS = 8.5 * 60 * 60 * 1000;

const TEST_HH_MM = "19:30"; // for testing purposes (set time)
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

// Checks if a time is within the mandatory break time (13:00 to 14:30)
function isInMandatoryBreak(time) {
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  return mins >= 13.5 * 60 && mins < 14.5 * 60; // 13:00 to 14:30
}

// Main update function
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

  // Step 1: Duplicate punches that fall in the mandatory break (13:00 to 14:30)
  let cleanedTimes = [];
  rawTimes.forEach((t) => {
    cleanedTimes.push(t); // Always add the original punch
    if (isInMandatoryBreak(t)) {
      cleanedTimes.push(t); // Duplicate the punch if it falls in break time
    }
  });


  // Step 2: Insert the fixed mandatory break (13:00 to 14:30) if no punches fall in it
  cleanedTimes.push("13:30", "14:30");

  // Step 3: Sort the final punches in chronological order
  cleanedTimes.sort();

  let totalInMs = 0;
  let totalOutMs = 0;
  let firstIn = null;

  // Step 4: Process the punches in pairs (in-out)
  for (let i = 0; i < cleanedTimes.length; i += 2) {
    const inTime = cleanedTimes[i];
    const outTime = cleanedTimes[i + 1] || getCurrentTimeStr(now); // Default to current time if no out time

    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);

    const inDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), inH, inM);
    const outDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), outH, outM);

    if (!firstIn) firstIn = inDate; // Set the first in time

    totalInMs += outDate - inDate; // Accumulate in time

    if (i + 2 < cleanedTimes.length) {
      const nextIn = cleanedTimes[i + 2];
      const [nH, nM] = nextIn.split(':').map(Number);
      const nextInDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nH, nM);
      totalOutMs += nextInDate - outDate; // Accumulate out time
    }
  }

  // Step 5: Calculate escape time and remaining time
  const escapeTime = new Date(firstIn.getTime() + WORKDAY_MS + totalOutMs);
  const remainingMs = Math.max(WORKDAY_MS - totalInMs, 0);

  // Update DOM
  document.getElementById("total-in").textContent = formatTimeReadable(totalInMs);
  document.getElementById("total-out").textContent = formatTimeReadable(totalOutMs);
  document.getElementById("escape-time").textContent = escapeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("remaining").textContent = formatTimeReadable(remainingMs);
  document.getElementById("refreshedAt").textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initial update
updateTimeDisplay();

// Update every second
setInterval(updateTimeDisplay, 1000);
