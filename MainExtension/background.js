// Listener for refreshing data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSessionIdAndCallAPI") {
        validateToken(request.token)
            .then(() => fetchAndUpdateData(request.token))
            .catch(err => console.error("❌ Error in check or fetch:", err));
    } else if (request.action === "openAndScrape") {
        handleLoginAndScrape(request);
    }
});

function handleLoginAndScrape(request) {
    const targetUrl = "http://192.168.1.200:88";
    chrome.storage.local.set({ generated: "yes" });

    chrome.tabs.create({
        url: `${targetUrl}/COSEC/Login/Login`,
        active: false
    }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: loginToCosec,
                    args: [request.userId, request.password],
                });
            }
        });
    });
}

function loginToCosec(userId, password) {
    localStorage.removeItem("SecurityManager.token");
    const userField = document.getElementById('loginid');
    const passField = document.getElementById('pwd');
    const loginButton = document.getElementById('btnlogin');

    if (userField && passField && loginButton) {
        userField.value = userId;
        passField.value = password;
        loginButton.click();
    }
}

async function validateToken(token) {
    const url = "http://192.168.1.200:88";
    const apiUrl = `${url}/cosec/api/NPunchView/getDataListOnPageLoad?MenuID=12053&token=${encodeURIComponent(token)}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Referer': `${url}/COSEC/Default/Default`
            },
        });

        const data = await response.json();
        console.log("✅ API response (check):", data);
        return data;
    } catch (err) {
        console.error("❌ Failed to fetch getDataListOnPageLoad:", err);
        throw err;
    }
}

function fetchAndUpdateData(token) {
    return new Promise((resolve) => {
        const url = "http://192.168.1.200:88";

        Promise.all([
            getCookie(url, "ASP.NET_SessionId"),
            getCookie(url, "UserID"),
            getCookie(url, "Password")
        ]).then(([sessionCookie, userIdCookie, passwordCookie]) => {
            if (!sessionCookie?.value) {
                console.error("ASP.NET_SessionId not found");
                resolve({ error: "No session" });
                return;
            }

            processPunchData(token, sessionCookie.value, userIdCookie?.value, passwordCookie?.value, resolve);
        });
    });
}

function getCookie(url, name) {
    return new Promise((resolve) => {
        chrome.cookies.get({ url, name }, resolve);
    });
}

async function processPunchData(token, sessionId, userId, password, resolve) {
    const today = new Date();
    // const today = new Date('2025-05-16'); // e.g., Monday
    const currentDay = today.getDay(); // 0 (Sun) - 6 (Sat)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((currentDay + 6) % 7));

    const datesToFetch = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        if (date <= today) datesToFetch.push(formatDate(date));
    }

    if (currentDay === 1) {
        const lastFriday = new Date(today);
        lastFriday.setDate(today.getDate() - 3);
        datesToFetch.unshift(formatDate(lastFriday));
    }

    const workingDays = datesToFetch.filter(dateStr => {
        const day = new Date(dateStr).getDay();
        return day !== 0 && day !== 6;
    });

    const lastTwoWorkingDays = workingDays.slice(-2);

    const allUniqueDates = Array.from(new Set([...workingDays, ...lastTwoWorkingDays]));

    const { generated } = await chrome.storage.local.get('generated');
    const finalData = {};

    const fetchPromises = allUniqueDates.map(date =>
        new Promise((res) => {
            fetchPunchDataForDate(token, sessionId, userId, password, date, (data) => {
                Object.assign(finalData, data);
                res();
            });
        })
    );

    await Promise.all(fetchPromises);

    chrome.storage.local.set({ timeData: finalData });

    if (generated === "yes") {
        chrome.storage.local.remove('generated');
        closeGeneratedTab();
        sendToSheet(finalData, (res) => console.log("Sheet response", res));
    }

    resolve(finalData);
}

function closeGeneratedTab() {
    chrome.tabs.query({ url: "http://192.168.1.200:88/COSEC/Default/Default*" }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.remove(tabs[0].id);
        }
    });
}

async function fetchPunchDataForDate(token, sessionId, userId, password, dateStr, callback) {
    const apiUrl = `http://192.168.1.200:88/cosec/api/NPunchView/changePDateSelection/?token=${token}`;
    const { userId: storedUserId } = await chrome.storage.local.get('userId');

    const payload = {
        UserId: storedUserId,
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
            const groupedData = groupPunchData(result);
            callback(groupedData);
        })
        .catch(err => {
            console.error(`Error fetching data for ${dateStr}`, err);
            callback({ [dateStr]: [] });
        });
}

function groupPunchData(data) {
    const grouped = {};

    data.forEach(item => {
        const parsed = extractDateAndTime(item.EDatetime);
        if (!parsed) return;
        grouped[parsed.date] = grouped[parsed.date] || [];
        grouped[parsed.date].push(parsed.time);
    });

    const final = {};
    for (const date in grouped) {
        final[date] = addBreak(grouped[date], date);
    }
    return final;
}

function addBreak(times, date) {
    const breakStartMin = toMinutes("13:30");
    const breakEndMin = toMinutes("14:30");
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const isToday = formatDate(new Date()) === date;

    if (currentMinutes < breakStartMin && isToday) return times;

    const punches = times.map((t, i) => ({ type: i % 2 === 0 ? 'in' : 'out', time: t }));
    const statusAtBreakStart = getStatusAtTime(punches, breakStartMin - 0.5);
    const statusAtBreakEnd = getStatusAtTime(punches, breakEndMin + 0.5);

    const filtered = punches.filter(p => {
        const timeMin = toMinutes(p.time);
        return timeMin < breakStartMin || timeMin > breakEndMin;
    });

    if (statusAtBreakStart === 'in' && statusAtBreakEnd === 'in') {
        filtered.push({ type: 'out', time: "13:30" }, { type: 'in', time: "14:30" });
    } else if (statusAtBreakStart === 'in') {
        filtered.push({ type: 'out', time: "13:30" });
    } else if (statusAtBreakEnd === 'in') {
        filtered.push({ type: 'in', time: "14:30" });
    }

    return filtered.sort((a, b) => toMinutes(a.time) - toMinutes(b.time)).map(p => p.time);
}

function getStatusAtTime(punches, targetMin) {
    let status = 'out';
    for (const punch of punches) {
        if (toMinutes(punch.time) > targetMin) break;
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

    return {
        date: datePart,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    };
}

function formatDate(date) {
    return date.toLocaleDateString('en-GB');
}

function toMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function sendToSheet(data, callback) {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbw2e939-5x0U59skV1tFqAdWvXMnOutCnInXVSvRIUL2HFYYKgWG5Qp91PChZWpdKO1Fw/exec";

    fetch(webAppUrl, {
        mode: "no-cors",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
        .then(res => callback(res))
        .catch(err => {
            console.error("Web App error:", err);
            callback({ status: "error", error: err.message });
        });
}