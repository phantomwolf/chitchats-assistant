export {};

import { ChitChatsPendingPage } from "./content/chitchats-pending.js";

const CONTENT_INIT_KEY = "__chitchatsContentRunnerInitialized";

type PopupMessage =
  | { source: "popup"; command: "ping" }
  | { source: "popup"; command: "run_once" }
  | { source: "popup"; command: "run_all" };

async function run(once: boolean = false) {
  const pendingPage = new ChitChatsPendingPage();
  let shipments = pendingPage.getPendingShipments();
  if (once) {
    shipments = shipments.slice(0, 1);
  }
  console.log(shipments);
  for (const shipment of shipments) {
    try {
      await shipment.openPopup();
      await shipment.fillProductDetails();
      await shipment.fillPackageDetails();
      await shipment.fillPostageDetails();
      await shipment.downloadShippingLabel();
    } catch (err) {
      if (err instanceof Error) {
        console.log(`[Order ${shipment.orderId}] Failed to buy shipping label: ${err.message}`);
      }
    }
  }
}

function initContentRunner() {
  const globalScope = globalThis as typeof globalThis & Record<string, unknown>;
  if (globalScope[CONTENT_INIT_KEY]) {
    return;
  }
  globalScope[CONTENT_INIT_KEY] = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const payload = message as PopupMessage | undefined;
    if (!payload || payload.source !== "popup") {
      return;
    }

    if (payload.command === "ping") {
      sendResponse({ ok: true });
      return;
    }

    if (payload.command === "run_once") {
      run(true)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }

    if (payload.command === "run_all") {
      run(false)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
  });
}

initContentRunner();
