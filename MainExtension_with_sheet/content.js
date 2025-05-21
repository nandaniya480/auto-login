fetchApiData();
function fetchApiData() {
    setTimeout(() => {
        const quickLinksLabel = document.querySelector('label[ng-click="pgObj.tabClick(\'2\')"]');
        if (quickLinksLabel) {
            quickLinksLabel.click();

            setTimeout(() => {
                const nPunchLink = Array.from(document.querySelectorAll('div[ng-click^="pgObj.reDirectPage"]'))
                    .find(div => div.innerText.includes("N-Punch View"));

                if (nPunchLink) {
                    nPunchLink.click();

                    setTimeout(() => {
                        // console.log("⏳ Looking for table...");
                        // const tables = document.querySelectorAll("table");

                        // let foundTimeValues = [];

                        // tables.forEach((table) => {
                        //     const headers = Array.from(table.querySelectorAll("th"));
                        //     const timeIndex = headers.findIndex(th =>
                        //         th.innerText.trim().toLowerCase() === "time"
                        //     );

                        //     if (timeIndex !== -1) {
                        //         const rows = table.querySelectorAll("tbody tr");
                        //         rows.forEach(row => {
                        //             const cells = row.querySelectorAll("td");
                        //             if (cells[timeIndex]) {
                        //                 const timeValue = cells[timeIndex].innerText.trim();
                        //                 if (timeValue) {
                        //                     foundTimeValues.push(timeValue);
                        //                 }
                        //             }
                        //         });
                        //     }
                        // });
                        // if (foundTimeValues.length) {
                        const token = localStorage.getItem("SecurityManager.token");
                        if (token) {
                            chrome.runtime.sendMessage({
                                action: "getSessionIdAndCallAPI",
                                token: token,
                            });
                        }
                        // } else {
                        //     console.warn("⚠️ No time values found.");
                        // }
                    }, 500);
                } else {
                    console.warn("⚠️ N-Punch View not found.");
                }
            }, 1000);
        } else {
            console.warn("⚠️ Quick Links tab not found.");
        }
    }, 5000);
}