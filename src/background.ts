// Highlark Service Worker (MV3 required)

// Service worker only logs events - popup and annotate windows handle all functionality
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Extension installed
  } else if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // Extension updated
  }
});


