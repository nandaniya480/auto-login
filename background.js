chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSessionIdAndCallAPI") {
        console.log("Received message from content.js");
        chrome.cookies.get({
            url: "http://192.168.1.200:88",
            name: "ASP.NET_SessionId"
        }, function (cookie) {
            if (!cookie || !cookie.value) {
                console.error("ASP.NET_SessionId not found");
                return;
            }

            const token = request.token;

            processPunchData(token)

            // const sessionId = cookie.value;
            // const apiUrl = `http://192.168.1.200:88/cosec/api/NPunchView/changePDateSelection/?token=${token}`;
            // fetch(apiUrl, {
            //     method: "POST",
            //     credentials: "include",
            //     headers: {
            //         "Content-Type": "application/json",
            //         "Accept": "application/json"
            //     },
            //     body: JSON.stringify({
            //         UserId: 673,
            //         PDate: "14/04/2025",
            //         DateSelection: 4,
            //         AlwMonth: 1
            //     })
            // })
            //     .then(response => {
            //         return response.json();
            //     })
            //     .then(data => {
            //         const grdData = data.result.grdData;

            //         if (grdData && Array.isArray(grdData)) {
            //             let Data = [];
            //             grdData.forEach(item => {
            //                 Data.push(item.EDatetime);
            //             });
            //             console.log(Data)
            //             sendToSheet(Data, (sheetResponse) => {
            //                 // sendResponse(sheetResponse);
            //                 console.log(sheetResponse)
            //             });
            //             Data = [];
            //         } else {
            //             console.warn("No punch data found.");
            //         }
            //     })
            //     .catch(err => {
            //         console.error("Fetch error:", err);
            //     });
        });
    }
});
function processPunchData(token) {
    chrome.cookies.get({ url: "http://192.168.1.200:88", name: "ASP.NET_SessionId" }, function (cookie) {
        if (!cookie || !cookie.value) {
            console.error("ASP.NET_SessionId not found");
            return;
        }

        const sessionId = cookie.value;
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const formattedToday = formatDate(today);     // e.g., 15/04/2025
        const formattedYesterday = formatDate(yesterday); // e.g., 14/04/2025

        const finalData = {};

        fetchPunchDataForDate(token, sessionId, formattedYesterday, (yesterdayData) => {
            // yesterdayData is now: { "17/04/2025": [times] }

            fetchPunchDataForDate(token, sessionId, formattedToday, (todayData) => {
                // todayData is now: { "18/04/2025": [times] }

                // Merge both
                const finalData = { ...yesterdayData, ...todayData };

                console.log("Final Punch Data", finalData);

                // Optional: send to sheet or other logic
                sendToSheet(finalData, (res) => console.log("Sheet response", res));
            });
        });

    });
}
function fetchPunchDataForDate(token, sessionId, dateStr, callback) {
    const apiUrl = `http://192.168.1.200:88/cosec/api/NPunchView/changePDateSelection/?token=${token}`;
    const payload = {
        UserId: 673,
        PDate: dateStr,
        DateSelection: 4,
        AlwMonth: 1
    };

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Cookie": `UserID=Njcz; Password=I0FoaXI2Njk5; ASP.NET_SessionId=${sessionId}; ProductID=COSEC`
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            const result = data?.result?.grdData || [];

            const groupedData = {};

            result.forEach(item => {
                const parsed = extractDateAndTime(item.EDatetime);
                if (!parsed) return;

                if (!groupedData[parsed.date]) {
                    groupedData[parsed.date] = [];
                }

                groupedData[parsed.date].push(parsed.time);
            });

            callback(groupedData);
        })
        .catch(err => {
            console.error(`Error fetching data for ${dateStr}`, err);
            callback(dateStr, []);
        });
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

function parseEDatetime(datetimeStr) {
    const [datePart, timePart] = datetimeStr.split(" ");
    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split("/").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) return null;

    // Rebuild time as "HH:MM"
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    return { date, time };
}


function formatDate(date) {
    return date.toLocaleDateString('en-GB').split('/').join('/');
}

function extractTime(datetimeStr) {
    const dateObj = new Date(datetimeStr);
    return dateObj.toTimeString().split(':').slice(0, 2).join(':');
}

function sendToSheet(data, callback) {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbyBvzwX0hvSqiV-TZNfAgtOziAXOib_be0MeGLnV5VXwjhs6LTfgyNGnKDs36eX79f9/exec";
    fetch(webAppUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Web App response:", data);
            callback(data);
        })
        .catch((err) => {
            console.error("Web App error:", err);
            callback({ status: "error", error: err.message });
        });
}