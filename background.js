// Background script for ad blocker
let blockedCount = 0;
let isEnabled = true;

function updateRuleset(enable) {
  const payload = enable
    ? { enableRulesetIds: ["ad_rules"] }
    : { disableRulesetIds: ["ad_rules"] };
  chrome.declarativeNetRequest.updateEnabledRulesets(payload);
}

function setBadgeForActiveTab(text, bg = "#ff0000") {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs && tabs[0] ? tabs[0].id : undefined;
    if (tabId !== undefined) {
      chrome.action.setBadgeText({ text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: bg });
    }
  });
}

function refreshBadge() {
  chrome.storage.local.get("blockedCount", (result) => {
    const count = result.blockedCount || 0;
    const text = count > 0 ? String(count) : "";
    const color = isEnabled ? "#ff0000" : "#808080";
    setBadgeForActiveTab(text, color);
  });
}

function syncStateFromStorage() {
  chrome.storage.local.get(["enabled", "blockedCount"], (result) => {
    isEnabled = result.enabled !== undefined ? result.enabled : true;
    blockedCount = result.blockedCount || 0;
    updateRuleset(isEnabled);
    refreshBadge();
  });
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set(
    {
      enabled: true,
      blockedCount: 0,
      whitelist: [],
    },
    syncStateFromStorage
  );
});

// Ensure state on browser startup
chrome.runtime.onStartup.addListener(syncStateFromStorage);

// Listen for web requests and block ads
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(() => {
  blockedCount++;
  chrome.storage.local.set({ blockedCount }, refreshBadge);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    blockedCount = 0;
    chrome.storage.local.set({ blockedCount: 0 }, () => {
      refreshBadge();
      sendResponse({ success: true });
    });
    return true;
  }
});

// Update badge with blocked count on navigation changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    refreshBadge();
  }
});

chrome.tabs.onActivated.addListener(() => {
  refreshBadge();
});
