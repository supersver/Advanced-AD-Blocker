// Content script to block ads and unwanted elements
(function () {
  "use strict";

  // Common ad selectors
  const adSelectors = [
    // Generic ad containers
    ".ad",
    ".ads",
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    ".banner",
    ".popup",
    ".overlay",
    ".modal-ad",
    ".sponsored",
    ".promo",
    ".promotion",

    // Google Ads
    ".adsbygoogle",
    "ins.adsbygoogle",
    "[data-ad-client]",
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',

    // Facebook ads
    '[data-testid="sponsored_message"]',
    '[aria-label*="Sponsored"]',

    // Common ad networks
    'iframe[src*="amazon-adsystem"]',
    'iframe[src*="adsystem.amazon"]',
    'iframe[src*="outbrain"]',
    'iframe[src*="taboola"]',
    'iframe[src*="revcontent"]',
    'iframe[src*="mgid.com"]',

    // Video ads
    ".video-ads",
    ".preroll",
    ".midroll",
    ".postroll",

    // Social media ads
    '[data-testid*="ad"]',
    '[aria-label*="ad"]',

    // Generic patterns
    '[class*="ad-"]',
    '[id*="ad-"]',
    '[class*="ads-"]',
    '[id*="ads-"]',
    '[class*="banner"]',
    '[id*="banner"]',
    '[class*="sponsor"]',
    '[id*="sponsor"]',
  ];

  let observer = null;
  let intervalId = null;
  let styleEl = null;
  let running = false;

  // Block elements function
  function blockAds() {
    adSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element && element.parentNode) {
            // Remove aggressively to prevent reflowed placeholders
            element.remove();
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });
  }

  // Block tracking scripts
  function blockTrackingScripts() {
    const scripts = document.querySelectorAll("script[src]");
    scripts.forEach((script) => {
      const src = script.src.toLowerCase();
      if (
        src.includes("google-analytics") ||
        src.includes("googletagmanager") ||
        src.includes("facebook.net") ||
        src.includes("doubleclick") ||
        src.includes("googlesyndication") ||
        src.includes("outbrain") ||
        src.includes("taboola")
      ) {
        script.remove();
      }
    });
  }

  // Hide cookie banners and GDPR notices
  function hideCookieBanners() {
    const cookieSelectors = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="gdpr"]',
      '[id*="gdpr"]',
      '[class*="consent"]',
      '[id*="consent"]',
      ".privacy-notice",
      ".cookie-banner",
      ".cookie-bar",
    ];

    cookieSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const txt = element.textContent.toLowerCase();
          if (
            txt.includes("cookie") ||
            txt.includes("privacy") ||
            txt.includes("consent")
          ) {
            element.style.setProperty("display", "none", "important");
            element.style.setProperty("visibility", "hidden", "important");
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });
  }

  // Anti-adblock detection bypass
  function bypassAntiAdblock() {
    // Common anti-adblock variable names
    const antiAdblockVars = ["adblock", "AdBlock", "adBlock", "ads_blocked"];

    antiAdblockVars.forEach((varName) => {
      try {
        if (window[varName]) {
          window[varName] = false;
        }
      } catch (e) {}
    });

    // Override common anti-adblock functions
    window.open = new Proxy(window.open, {
      apply: function (target, thisArg, argumentsList) {
        const url = argumentsList[0];
        if (url && (url.includes("adblock") || url.includes("disable"))) {
          return null;
        }
        return target.apply(thisArg, argumentsList);
      },
    });
  }

  function init() {
    if (running) return;
    running = true;

    // Initial blocking
    blockAds();
    blockTrackingScripts();
    hideCookieBanners();
    bypassAntiAdblock();

    // Create observer for dynamic content
    observer = new MutationObserver((mutations) => {
      let shouldBlock = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldBlock = true;
        }
      });

      if (shouldBlock) {
        setTimeout(() => {
          blockAds();
          hideCookieBanners();
        }, 100);
      }
    });

    // Start observing
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Periodic cleanup
    intervalId = setInterval(() => {
      blockAds();
      hideCookieBanners();
    }, 3000);

    // Inject CSS to hide common ad patterns
    styleEl = document.createElement("style");
    styleEl.textContent = `
      /* Hide common ad patterns */
      [class*="ad-"], [id*="ad-"],
      [class*="ads-"], [id*="ads-"],
      [class*="banner"], [id*="banner"],
      [class*="sponsor"], [id*="sponsor"],
      .adsbygoogle, ins.adsbygoogle,
      iframe[src*="doubleclick"],
      iframe[src*="googlesyndication"],
      iframe[src*="amazon-adsystem"],
      iframe[src*="outbrain"],
      iframe[src*="taboola"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
    running = false;
  }

  function maybeStart() {
    chrome.storage.local.get("enabled", (result) => {
      const enabled = result.enabled !== undefined ? result.enabled : true;
      if (enabled) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
          init();
        }
      } else {
        stop();
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
      const enabled = changes.enabled.newValue;
      if (enabled) init();
      else stop();
    }
  });

  // Entry
  maybeStart();
})();
