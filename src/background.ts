// Highlark Service Worker (MV3 required)
console.log('Highlark service worker initialized');

// Service worker only logs events - popup and annotate windows handle all functionality
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('Highlark extension installed');
  } else if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    console.log('Highlark extension updated');
  }
});

