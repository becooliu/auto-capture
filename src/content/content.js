let selectionActive = false;
let startX, startY, endX, endY, scrollTop, scrollLeft, pageX, pageY;
let selectionRect = null;

// Create selection overlay
const overlay = document.createElement("div");
const style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; cursor: crosshair; display: none;`;
overlay.style = style;
document.body.appendChild(overlay);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startSelection") {
    console.log("listion startSelection:");
    startSelection();
  } else if (message.action === "captureRegion") {
    captureRegion();
  }
});

function startSelection() {
  selectionActive = true;
  overlay.style.display = "block";

  overlay.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("keydown", handleEscape);
}

function handleMouseDown(e) {
  if (!selectionActive) return;

  startX = e.clientX;
  startY = e.clientY;
  pageX = e.pageX;
  pageY = e.pageY;
  scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
  // console.log("mousedown event", startX, startY, pageX, pageY);

  if (!selectionRect) {
    selectionRect = document.createElement("div");
    selectionRect.style.position = "fixed";
    selectionRect.style.border = "2px dashed #4CAF50";
    selectionRect.style.backgroundColor = "rgba(76, 175, 80, 0.2)";
    selectionRect.style.zIndex = "2147483647";
    selectionRect.style.pointerEvents = "none";
    document.body.appendChild(selectionRect);
  }

  selectionRect.style.left = `${startX}px`;
  selectionRect.style.top = `${startY}px`;
  selectionRect.style.width = "0px";
  selectionRect.style.height = "0px";

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function handleMouseMove(e) {
  if (!selectionActive) return;

  endX = e.clientX;
  endY = e.clientY;

  const rectX = Math.min(startX, endX);
  const rectY = Math.min(startY, endY);
  const rectWidth = Math.abs(endX - startX);
  const rectHeight = Math.abs(endY - startY);

  selectionRect.style.left = `${rectX}px`;
  selectionRect.style.top = `${rectY}px`;
  selectionRect.style.width = `${rectWidth}px`;
  selectionRect.style.height = `${rectHeight}px`;
}

// 鼠标松开的处理函数：移除事件并发送选择区域的坐标等信息到service worker
function handleMouseUp() {
  if (!selectionActive) return;

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);

  const rectX = Math.min(startX, endX);
  const rectY = Math.min(startY, endY);
  const rectWidth = Math.abs(endX - startX);
  const rectHeight = Math.abs(endY - startY);

  saveCoordinates({
    scrollleft: pageX,
    scrollTop: pageY,
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
  });

  cleanupSelection();
}

function handleEscape(e) {
  if (e.key === "Escape") {
    cleanupSelection();
  }
}

function cleanupSelection() {
  selectionActive = false;
  overlay.style.display = "none";

  if (selectionRect) {
    selectionRect.remove();
    selectionRect = null;
  }

  overlay.removeEventListener("mousedown", handleMouseDown);
  document.removeEventListener("keydown", handleEscape);
}

function saveCoordinates(coords) {
  // Send coordinates to background script for saving
  chrome.runtime.sendMessage({
    type: "saveCoordinates",
    coords: coords,
  });
}

async function waitPageScroll() {
  window.scroll({ top: pageY, left: pageX, behavior: "smooth" });
  const pageSrollTop =
    document.documentElement.scrollTop || document.body.scrollTop;
  const pagesrollLeft =
    document.documentElement.scrollLeft || document.body.scrollLeft;

  await new Promise((resolve) => {
    const checkScrollAction = () => {
      console.log("check equal:", pageSrollTop, scrollTop);
      if (pageSrollTop == scrollTop && pagesrollLeft == scrollLeft) {
        resolve();
      } else {
        console.log("--not complete--");
        requestAnimationFrame(checkScrollAction);
      }
    };
    checkScrollAction();
  });
}

function captureRegion() {
  // Get saved coordinates from storage
  chrome.storage.local.get("regionCoords", async (result) => {
    if (!result.regionCoords) {
      console.error("No coordinates saved");
      return;
    }

    // 检查页面滚动到指定位置后再进行截图
    await waitPageScroll().then(() => {
      console.log("await ...");
      const coords = result.regionCoords;

      // Use Chrome API to capture visible tab
      chrome.runtime.sendMessage(
        { type: "captureVisibleTab" },
        async (dataUrl) => {
          if (!dataUrl) {
            console.error("Failed to capture visible tab");
            return;
          }

          // Create image to crop from
          const img = new Image();
          img.onload = function () {
            // Create canvas for cropping
            const canvas = document.createElement("canvas");
            canvas.width = coords.width;
            canvas.height = coords.height;
            const ctx = canvas.getContext("2d");

            // Draw cropped region
            ctx.drawImage(
              img,
              coords.x,
              coords.y,
              coords.width,
              coords.height,
              0,
              0,
              coords.width,
              coords.height
            );

            // Convert to data URL and save
            const croppedDataUrl = canvas.toDataURL("image/png");
            chrome.runtime.sendMessage({
              type: "downloadImage",
              dataUrl: croppedDataUrl,
              filename: `region_capture_${Date.now()}.png`,
            });
          };
          img.src = dataUrl;
        }
      );
    });
  });
}
