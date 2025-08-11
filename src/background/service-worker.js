// Save region coordinates to storage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "saveCoordinates") {
    chrome.storage.local.set({ regionCoords: message.coords }, async () => {
      // Create JSON blob and download
      const json = JSON.stringify(message.coords, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      // const url = URL.createObjectURL(blob);

      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      chrome.downloads.download({
        url: dataUrl,
        filename: `region_coords_${Date.now()}.json`,
        saveAs: true,
      });

      // Notify popup that selection is saved
      chrome.runtime.sendMessage({ type: "selectionSaved" });
    });
  }

  if (message.type === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse(dataUrl);
    });
    return true; // Keep the message channel open for async response
  }

  if (message.type === "downloadImage") {
    chrome.downloads.download({
      url: message.dataUrl,
      filename: message.filename,
      saveAs: true,
    });

    // Notify popup that capture is complete
    chrome.runtime.sendMessage({ type: "captureComplete" });
  }
});
