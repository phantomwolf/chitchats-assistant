export {};

import { ChitChatsPendingShipmentPage } from "./content/chitchats-shipment-page.js";
import { ChitChatsShipment } from "./content/chitchats-shipment.js";
import { getSettings } from "./utils/settings.js";
import { sleep } from "./utils/utils.js";

const CONTENT_INIT_KEY = "__chitchatsContentRunnerInitialized";

type PopupMessage =
  | { source: "popup"; command: "ping" }
  | { source: "popup"; command: "buy_selected" }
  | { source: "popup"; command: "buy_all" };

async function buyShipments(isSelected: boolean = false) {
  const shipmentPage = new ChitChatsPendingShipmentPage();
  const shipmentRowIds = shipmentPage.getShipmentRowIds(isSelected);
  for (const rowId of shipmentRowIds) {
    const shipment = new ChitChatsShipment(rowId);
    if (shipment.status !== "incomplete") {
      console.log(
        `Skipping order ${shipment.orderId} due to its status "${shipment.status}" isn't "incomplete"`);
      continue;
    }

    try {
      await shipment.openPopup();
      await shipment.fillProductDetails();
      await shipment.fillPackageDetails();
      await shipment.fillPostageDetails();
      await shipment.downloadShippingLabel();
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`[Order ${shipment.orderId}] ${err.message}`);
      } else {
        throw new Error(`[Order ${shipment.orderId}] ${err}`);
      }
    }

    const settings = await getSettings();
    await sleep(settings.shipmentDelay);
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

    if (payload.command === "buy_selected") {
      buyShipments(true)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }

    if (payload.command === "buy_all") {
      buyShipments(false)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
  });
}

initContentRunner();
