document.getElementById("getAndSavePosition").addEventListener("click", () => {
  console.log("startSelection");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startSelection" });
    document.getElementById("statusText").textContent =
      "Select a region on the page...";
  });
});

document.getElementById("capture").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "captureRegion" });
    document.getElementById("statusText").textContent = "Capturing region...";
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "selectionSaved") {
    document.getElementById("statusText").textContent =
      "Region saved! Ready to capture.";
  } else if (message.type === "captureComplete") {
    document.getElementById("statusText").textContent = "Screenshot saved!";
  }
});
