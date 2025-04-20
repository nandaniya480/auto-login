chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSessionIdAndCallAPI") {
        const row = {
            "17/04/2025": ["10:31", "11:20", "11:20", "11:26", "11:26", "13:30", "14:25", "18:00", "18:06", "20:10"],
            "18/04/2025": ["11:05", "13:30", "14:26", "17:49", "17:56"]
          };
        sendToSheet(row)
    }
});

function sendToSheet(data, callback) {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbyBvzwX0hvSqiV-TZNfAgtOziAXOib_be0MeGLnV5VXwjhs6LTfgyNGnKDs36eX79f9/exec";

    fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
