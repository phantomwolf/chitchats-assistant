export {};

const runButton = document.getElementById("run") as HTMLButtonElement | null;
const statusEl = document.getElementById("status") as HTMLDivElement | null;

function setStatus(message: string) {
  if (statusEl) statusEl.textContent = message;
}

function injectBanner(message: string) {
  const existing = document.getElementById("ts-extension-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "ts-extension-banner";
  banner.textContent = message;

  banner.style.position = "fixed";
  banner.style.top = "10px";
  banner.style.right = "10px";
  banner.style.zIndex = "999999";
  banner.style.padding = "8px 12px";
  banner.style.background = "#1f2937";
  banner.style.color = "#fff";
  banner.style.fontSize = "12px";
  banner.style.borderRadius = "6px";
  banner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.remove();
  }, 2500);
}

async function runScript() {
  setStatus("Running...");

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || tab.id === undefined) {
    setStatus("No active tab found.");
    return;
  }

  const result = await chrome.storage.sync.get({ bannerMessage: "Injected script ran." });
  const bannerMessage = String(result.bannerMessage || "Injected script ran.");

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectBanner,
    args: [bannerMessage]
  });

  setStatus("Done.");
}

runButton?.addEventListener("click", () => {
  runScript().catch((err) => {
    setStatus(`Error: ${String(err)}`);
  });
});
