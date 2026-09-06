// Background Service Worker for Scrabble Solver Chrome Extension

// Configure side panel to open when extension toolbar action icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error("Failed to set panel behavior:", err));
  }
});

// Listener for messages between content script and side panel if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PING") {
    sendResponse({ status: "PONG" });
  }
  return true;
});
