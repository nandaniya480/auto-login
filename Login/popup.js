document.getElementById("openTab").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://192.168.1.200:88/login" });
});
