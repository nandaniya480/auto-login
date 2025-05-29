fetchApiData();

async function retryGetToken(maxRetries = 5, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const token = localStorage.getItem("SecurityManager.token");
        if (token) return token;

        console.warn(`⚠️ Token not found. Retrying... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Token not found after multiple retries.");
}

async function fetchApiData() {
    try {
        const token = await retryGetToken();

        await new Promise(resolve => setTimeout(resolve, 1000));
        chrome.runtime.sendMessage({
            action: "getSessionIdAndCallAPI",
            token: token,
        });

    } catch (error) {
        console.warn("⚠️ Error during fetchApiData:", error);
    }
}
