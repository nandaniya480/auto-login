document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  chrome.storage.local.get(["userId", "password"], (creds) => {
    if (!creds.userId || !creds.password) {
      loginForm.style.display = "block";
    } else {
      loginForm.style.display = "none";
      loadMainLogic(); // ✅ Load main logic here
    }
  });

  document.getElementById("saveCreds").addEventListener("click", () => {
    const userId = document.getElementById("userIdInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (userId && password) {
      chrome.storage.local.set({ userId, password }, () => {
        alert("✅ Credentials saved!");
        loginForm.style.display = "none";
        chrome.runtime.sendMessage({ action: "startAutoLogin" });
        loadMainLogic(); // ✅ Load main logic after login
      });
    } else {
      alert("❗ Please enter both user ID and password.");
    }
  });
});

function loadMainLogic() {
  const script = document.createElement("script");
  script.src = "main.js";
  document.body.appendChild(script);
}

