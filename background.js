// Background script for ad blocker
let blockCount = 0;
let isEnabled = true;

// Initialize storage and state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set(
    {
      enabled: true,
      blockedCount: 0,
      whitelist: [],
    },
    () => {
      isEnabled = true;
      blockCount = 0;
      updateRuleset(isEnabled);
      refreshBadge();
    },
  );
});

// Sync state from storage on startup
function syncStateFromStorage() {
  chrome.storage.local.get(["enabled", "blockedCount"], (result) => {
    isEnabled = result.enabled !== undefined ? result.enabled : true;
    blockCount = result.blockedCount || 0;
    updateRuleset(isEnabled);
    refreshBadge();
  });
}

// Ensure state on browser startup
chrome.runtime.onStartup.addListener(syncStateFromStorage);

function updateRuleset(enable) {
  const payload = enable
    ? { enableRulesetIds: ["ad_rules"] }
    : { disableRulesetIds: ["ad_rules"] };
  chrome.declarativeNetRequest.updateEnabledRulesets(payload, () => {
    if (chrome.runtime.lastError) {
      console.warn("Error updating ruleset:", chrome.runtime.lastError);
    }
  });
}

function incrementBlockCount() {
  blockCount++;
  chrome.storage.local.set({ blockedCount: blockCount }, () => {
    refreshBadge();
  });
}

function setBadgeForActiveTab(text, bg = "#ff0000") {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const tabId = tabs[0].id;
      chrome.action.setBadgeText({ text, tabId }, () => {
        if (!chrome.runtime.lastError) {
          chrome.action.setBadgeBackgroundColor({ color: bg, tabId });
        }
      });
    }
  });
}

function refreshBadge() {
  chrome.storage.local.get("blockedCount", (result) => {
    const count = result.blockedCount || 0;
    const text = count > 999 ? "999+" : count > 0 ? String(count) : "";
    const color = isEnabled ? "#ff0000" : "#808080";

    // Update badge for all tabs
    setBadgeForActiveTab(text, color);
  });
}

// Listen for blocked requests (MV3 declarativeNetRequest feedback)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  if (details && isEnabled) {
    incrementBlockCount();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "toggle") {
      isEnabled = !isEnabled;
      chrome.storage.local.set({ enabled: isEnabled }, () => {
        updateRuleset(isEnabled);
        refreshBadge();
        sendResponse({ enabled: isEnabled });
      });
      return true;
    }

    if (request.action === "getStatus") {
      chrome.storage.local.get(["enabled", "blockedCount"], (result) => {
        sendResponse({
          enabled: result.enabled !== undefined ? result.enabled : true,
          blockedCount: result.blockedCount || 0,
        });
      });
      return true;
    }

    if (request.action === "resetCount") {
      blockCount = 0;
      chrome.storage.local.set({ blockedCount: 0 }, () => {
        refreshBadge();
        sendResponse({ success: true });
      });
      return true;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ error: error.message });
  }
});

// Update badge on tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    refreshBadge();
  }
});

chrome.tabs.onActivated.addListener(() => {
  refreshBadge();
});
