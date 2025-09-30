document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const toggleBtn = document.getElementById("toggleBtn");
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");
  const blockedCount = document.getElementById("blockedCount");
  const resetBtn = document.getElementById("resetBtn");

  function updateUI(enabled, count) {
    blockedCount.textContent = (count || 0).toLocaleString();
    toggleBtn.setAttribute("aria-pressed", String(!!enabled));

    if (enabled) {
      toggleBtn.className = "toggle-btn enabled";
      statusText.textContent = "Protection Enabled";
      statusIndicator.className = "status-indicator status-enabled";
    } else {
      toggleBtn.className = "toggle-btn disabled";
      statusText.textContent = "Protection Disabled";
      statusIndicator.className = "status-indicator status-disabled";
    }
  }

  function refreshStatus() {
    chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response) updateUI(response.enabled, response.blockedCount);
    });
  }

  // Initial load
  refreshStatus();

  // Toggle functionality
  toggleBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggle" }, (response) => {
      if (chrome.runtime.lastError) return;
      chrome.storage.local.get("blockedCount", (result) => {
        updateUI(response?.enabled, result.blockedCount || 0);
      });
    });
  });

  // Reset counter
  resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetCount" }, () => {
      if (chrome.runtime.lastError) return;
      chrome.storage.local.get("enabled", (result) => {
        updateUI(result.enabled !== undefined ? result.enabled : true, 0);
      });
    });
  });

  // Periodic refresh while popup is open
  const interval = setInterval(refreshStatus, 1200);
  window.addEventListener("unload", () => clearInterval(interval));
});
