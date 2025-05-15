// Listener for refreshing data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSessionIdAndCallAPI") {
        fetchAndUpdateData(request.token);
    } else if (request.action === "openNewTab") {
        chrome.tabs.create({ url: request.url, active: false }, (tab) => {
            sendResponse({ tabId: tab.id });
        });
        return true; // Required for async sendResponse
    }
});

function fetchAndUpdateData(token) {
    return new Promise((resolve) => {
        const url = "http://192.168.1.200:88";

        Promise.all([
            getCookie(url, "ASP.NET_SessionId"),
            getCookie(url, "UserID"),
            getCookie(url, "Password")
        ]).then(([sessionCookie, userIdCookie, passwordCookie]) => {
            if (!sessionCookie || !sessionCookie.value) {
                console.error("ASP.NET_SessionId not found");
                resolve({ error: "No session" });
                return;
            }

            const sessionId = sessionCookie.value;
            const userId = userIdCookie ? userIdCookie.value : null;
            const password = passwordCookie ? passwordCookie.value : null;

            console.log("Session ID:", sessionId);
            console.log("UserID:", userId);
            console.log("Password:", password);

            processPunchData(token, sessionId, userId, password, resolve,);
        });
    });
}

function getCookie(url, name) {
    return new Promise((resolve) => {
        chrome.cookies.get({ url, name }, resolve);
    });
}

function processPunchData(token, sessionId, userId, password, resolve) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedToday = formatDate(today);
    const formattedYesterday = formatDate(yesterday);

    fetchPunchDataForDate(token, sessionId, userId, password, formattedYesterday, (yesterdayData) => {
        fetchPunchDataForDate(token, sessionId, userId, password, formattedToday, (todayData) => {
            const finalData = { ...yesterdayData, ...todayData };
            chrome.storage.local.set({ timeData: finalData });
            console.log("Final Punch Data", finalData);
            resolve(finalData);
        });
    });
}

async function fetchPunchDataForDate(token, sessionId, userId, password, dateStr, callback) {
    const apiUrl = `http://192.168.1.200:88/cosec/api/NPunchView/changePDateSelection/?token=${token}`;
    const result = await chrome.storage.local.get('userId');
    const payload = {
        UserId: result.userId,
        PDate: dateStr,
        DateSelection: 4,
        AlwMonth: 1
    };

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Cookie": `UserID=${userId}; Password=${password}; ASP.NET_SessionId=${sessionId}; ProductID=COSEC`
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            const result = data?.result?.grdData || [];
            const groupedData = {};
            result.forEach(item => {
                const parsed = extractDateAndTime(item.EDatetime);
                if (!parsed) return;
                if (!groupedData[parsed.date]) groupedData[parsed.date] = [];
                groupedData[parsed.date].push(parsed.time);
            });

            const final = {};
            Object.keys(groupedData).forEach(date => {
                const withBreaks = addBreak(groupedData[date], date);
                final[date] = withBreaks;
            });
            callback(final);
        })
        .catch(err => {
            console.error(`Error fetching data for ${dateStr}`, err);
            callback({ [dateStr]: [] });
        });
}

function addBreak(times, date) {
    const breakStart = "13:30";
    const breakEnd = "14:30";
    const breakStartMin = toMinutes(breakStart);
    const breakEndMin = toMinutes(breakEnd);

    const today = new Date();
    const formattedToday = formatDate(today);

    // Check current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Only add break if current time is after 13:30
    if (currentMinutes < breakStartMin && formattedToday === date) {
        return times;
    }

    const punches = times.map((t, i) => ({ type: i % 2 === 0 ? 'in' : 'out', time: t }));
    const statusAtBreakStart = getStatusAtTime(punches, breakStartMin - 1);
    const statusAtBreakEnd = getStatusAtTime(punches, breakEndMin + 1);

    const filtered = punches.filter(p => {
        const timeMin = toMinutes(p.time);
        return timeMin < breakStartMin || timeMin > breakEndMin;
    });

    if (statusAtBreakStart === 'in' && statusAtBreakEnd === 'in') {
        filtered.push({ type: 'out', time: breakStart }, { type: 'in', time: breakEnd });
    } else if (statusAtBreakStart === 'in') {
        filtered.push({ type: 'out', time: breakStart });
    } else if (statusAtBreakEnd === 'in') {
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

function extractDateAndTime(datetimeStr) {
    if (!datetimeStr) return null;
    const [datePart, timePart] = datetimeStr.split(" ");
    if (!datePart || !timePart) return null;

    const [hour, minute] = timePart.split(":").map(Number);
    if (isNaN(hour) || isNaN(minute)) return null;

    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { date: datePart, time };
}

function formatDate(date) {
    return date.toLocaleDateString('en-GB');
}

function toMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
