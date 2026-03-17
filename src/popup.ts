export {};

const buySelectedButton = document.getElementById("buy-selected") as HTMLButtonElement | null;
const buyAllButton = document.getElementById("buy-all") as HTMLButtonElement | null;
const statusElem = document.getElementById("status") as HTMLDivElement | null;
let isRunning = false;

type PopupCommand = "ping" | "buy_selected" | "buy_all";
type PopupMessage = { source: "popup"; command: PopupCommand };
type ContentResponse = { ok: boolean; error?: string };
const NO_RECEIVER_ERROR = "Could not establish connection. Receiving end does not exist.";
const CONTENT_SCRIPT_UNAVAILABLE_ERROR =
  "Content script is unavailable on this page. Open a ChitChats pending shipments page: https://chitchats.com/clients/*/shipments";

function setStatus(message: string) {
  if (statusElem) statusElem.textContent = message;
}

function getActiveTabId(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        reject(new Error("No active tab found."));
        return;
      }
      resolve(tabId);
    });
  });
}

function sendMessageToTab(tabId: number, message: PopupMessage): Promise<ContentResponse | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response?: ContentResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function ensureContentScriptConnected(tabId: number) {
  try {
    const pingResponse = await sendMessageToTab(tabId, { source: "popup", command: "ping" });
    if (!pingResponse?.ok) {
      throw new Error(pingResponse?.error || "Content script ping failed.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(NO_RECEIVER_ERROR)) {
      throw new Error(CONTENT_SCRIPT_UNAVAILABLE_ERROR);
    }
    throw error;
  }
}

async function pingThenSend(tabId: number, command: Exclude<PopupCommand, "ping">) {
  await ensureContentScriptConnected(tabId);

  const commandResponse = await sendMessageToTab(tabId, { source: "popup", command });
  if (!commandResponse?.ok) {
    throw new Error(commandResponse?.error || `Command failed: ${command}`);
  }
}

function disableButtons(disabled: boolean) {
  if (buySelectedButton) buySelectedButton.disabled = disabled;
  if (buyAllButton) buyAllButton.disabled = disabled;
}

buySelectedButton?.addEventListener("click", () => {
  if (isRunning) return;
  isRunning = true;
  disableButtons(true);
  setStatus("Pinging content script...");
  getActiveTabId()
    .then((tabId) => pingThenSend(tabId, "buy_selected"))
    .then(() => setStatus("Purchased shipping labels for selected ChitChats shipments."))
    .catch((err) => {
      setStatus(`${String(err)}`);
    })
    .finally(() => {
      isRunning = false;
      disableButtons(false);
    });
});

buyAllButton?.addEventListener("click", () => {
  if (isRunning) return;
  isRunning = true;
  disableButtons(true);
  setStatus("Pinging content script...");
  getActiveTabId()
    .then((tabId) => pingThenSend(tabId, "buy_all"))
    .then(() => setStatus("Purchased shipping labels for all pending ChitChats shipments."))
    .catch((err) => setStatus(`${String(err)}
ChitChats Assistant can only run on ChitChats pending shipments page: https://chitchats.com/clients/*/shipments`))
    .finally(() => {
      isRunning = false;
      disableButtons(false);
    });
});
