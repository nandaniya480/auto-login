const userId = "673";
const password = "#Ahir6699";

// Step 1: Auto login
const userField = document.getElementById('loginid');
const passField = document.getElementById('pwd');
const loginButton = document.getElementById('btnlogin');

if (userField && passField && loginButton) {
    userField.value = userId;
    passField.value = password;
    localStorage.setItem("autoLogin", "1");
    loginButton.click();
}

if (localStorage.getItem("autoLogin") === "1") {
    setTimeout(() => {
        localStorage.removeItem("autoLogin");

        const quickLinksLabel = document.querySelector('label[ng-click="pgObj.tabClick(\'2\')"]');
        if (quickLinksLabel) {
            console.log("✅ Clicking Quick Links tab...");
            quickLinksLabel.click();

            // Wait for Quick Links items to load
            setTimeout(() => {
                const nPunchLink = Array.from(document.querySelectorAll('div[ng-click^="pgObj.reDirectPage"]'))
                    .find(div => div.innerText.includes("N-Punch View"));

                if (nPunchLink) {
                    console.log("✅ Clicking N-Punch View...");
                    nPunchLink.click();

                    // Wait for table to load
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
                    }, 5000); // Wait for N-Punch View to load
                } else {
                    console.warn("⚠️ N-Punch View not found.");
                }
            }, 3000); // Wait for Quick Links items
        } else {
            console.warn("⚠️ Quick Links tab not found.");
        }

    }, 10000); // Wait after login
}
