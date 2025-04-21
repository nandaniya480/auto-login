// const userId = "673";
// const password = "#Ahir6699";

// Listener: Triggered by popup.js after user saves credentials
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startAutoLogin") {
        chrome.storage.local.get(["userId", "password"], (data) => {
            const userField = document.getElementById('loginid');
            const passField = document.getElementById('pwd');
            const loginButton = document.getElementById('btnlogin');

            if (userField && passField && loginButton) {
                userField.value = data.userId;
                passField.value = data.password;
                localStorage.setItem("autoLogin", "1");
                loginButton.click();
            }
        });
    }
});

// Auto-run fetchApiData() if autoLogin was triggered
if (localStorage.getItem("autoLogin") === "1") {
    fetchApiData();
}

function fetchApiData() {
    setTimeout(() => {
        localStorage.removeItem("autoLogin");

        const quickLinksLabel = document.querySelector('label[ng-click="pgObj.tabClick(\'2\')"]');
        if (quickLinksLabel) {
            console.log("✅ Clicking Quick Links tab...");
            quickLinksLabel.click();

            setTimeout(() => {
                const nPunchLink = Array.from(document.querySelectorAll('div[ng-click^="pgObj.reDirectPage"]'))
                    .find(div => div.innerText.includes("N-Punch View"));

                if (nPunchLink) {
                    console.log("✅ Clicking N-Punch View...");
                    nPunchLink.click();

                    setTimeout(() => {
                        console.log("⏳ Looking for table...");
                        const tables = document.querySelectorAll("table");
                        let foundTimeValues = [];

                        tables.forEach((table) => {
                            const headers = Array.from(table.querySelectorAll("th"));
                            const timeIndex = headers.findIndex(th =>
                                th.innerText.trim().toLowerCase() === "time"
                            );

                            if (timeIndex !== -1) {
                                const rows = table.querySelectorAll("tbody tr");
                                rows.forEach(row => {
                                    const cells = row.querySelectorAll("td");
                                    if (cells[timeIndex]) {
                                        const timeValue = cells[timeIndex].innerText.trim();
                                        if (timeValue) {
                                            foundTimeValues.push(timeValue);
                                        }
                                    }
                                });
                            }
                        });

                        if (foundTimeValues.length) {
                            const timeData = foundTimeValues.join("\n");
                            const token = localStorage.getItem("SecurityManager.token");

                            if (token) {
                                chrome.runtime.sendMessage({
                                    action: "getSessionIdAndCallAPI",
                                    token: token,
                                });
                            }
                        } else {
                            console.warn("⚠️ No time values found.");
                        }
                    }, 5000);
                } else {
                    console.warn("⚠️ N-Punch View not found.");
                }
            }, 3000);
        } else {
            console.warn("⚠️ Quick Links tab not found.");
        }
    }, 10000);
}
