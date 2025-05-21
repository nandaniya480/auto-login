// Background script for Chrome extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSessionIdAndCallAPI") {
        fetchAndUpdateData(request.token);
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
    const userField = document.getElementById('loginid');
    const passField = document.getElementById('pwd');
    const loginButton = document.getElementById('btnlogin');

    if (userField && passField && loginButton) {
        userField.value = userId;
        passField.value = password;
        loginButton.click();
    }
}

async function fetchAndUpdateData(token) {
    const url = "http://192.168.1.200:88";
    const [sessionCookie, userIdCookie, passwordCookie] = await Promise.all([
        getCookie(url, "ASP.NET_SessionId"),
        getCookie(url, "UserID"),
        getCookie(url, "Password")
    ]);

    if (!sessionCookie?.value) {
        console.error("ASP.NET_SessionId not found");
        return { error: "No session" };
    }

    return processPunchData(token, sessionCookie.value, userIdCookie?.value, passwordCookie?.value);
}

function getCookie(url, name) {
    return new Promise((resolve) => {
        chrome.cookies.get({ url, name }, resolve);
    });
}

// ... Rest of the functions remain the same as in the original background.js 