document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const toggleBtn = document.getElementById("toggleBtn");
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");
  const blockedCount = document.getElementById("blockedCount");
  const resetBtn = document.getElementById("resetBtn");

  let lastCount = 0;

  function animateCountUpdate() {
    blockedCount.classList.remove("updating");
    // Trigger reflow to restart animation
    void blockedCount.offsetWidth;
    blockedCount.classList.add("updating");
  }

  function updateUI(enabled, count) {
    const newCount = count || 0;
    blockedCount.textContent = newCount.toLocaleString();

    // Animate if count changed
    if (newCount !== lastCount) {
      animateCountUpdate();
      lastCount = newCount;
    }

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
      if (chrome.runtime.lastError) {
        console.error("Error getting status:", chrome.runtime.lastError);
        return;
      }
      if (response) {
        updateUI(response.enabled, response.blockedCount);
      }
    });
  }

  // Initial load
  refreshStatus();

  // Toggle functionality
  toggleBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggle" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error toggling:", chrome.runtime.lastError);
        return;
      }
      if (response) {
        chrome.storage.local.get("blockedCount", (result) => {
          updateUI(response.enabled, result.blockedCount || 0);
        });
      }
    });
  });

  // Reset counter
  resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetCount" }, (response) => {
      if (chrome.runtime.lastError) return;
      chrome.storage.local.get("enabled", (result) => {
        updateUI(result.enabled !== undefined ? result.enabled : true, 0);
      });
    });
  });

  // Periodic refresh while popup is open
  const interval = setInterval(refreshStatus, 1000);
  window.addEventListener("unload", () => clearInterval(interval));
});
