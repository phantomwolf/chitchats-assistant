import { setStatus } from "./status.js";
import { getSettings } from "../utils/settings.js";

const clientIdInput = document.getElementById("general-client-id") as HTMLInputElement | null;
const saveClientIdButton = document.getElementById("save-client-id") as HTMLButtonElement | null;
const shipmentDelayInput = document.getElementById("general-shipment-delay") as HTMLInputElement | null;
const saveShipmentDelayButton = document.getElementById("save-shipment-delay") as HTMLButtonElement | null;

async function loadGeneralSettings() {
  const settings = await getSettings();
  if (clientIdInput) {
    clientIdInput.value = settings.chitChatsClientId || "";
  }
  if (shipmentDelayInput) {
    shipmentDelayInput.value = settings.shipmentDelay?.toString() || "0";
  }
}

async function saveClientId() {
  const settings = await getSettings();
  const value = clientIdInput?.value.trim() || "";
  settings.chitChatsClientId = value;
  await settings.saveChitchatsClientId();
  setStatus("ChitChats client ID saved.", false);
}

async function saveShipmentDelay() {
  const settings = await getSettings();
  const value = parseInt(shipmentDelayInput?.value || "0", 10);
  settings.shipmentDelay = isNaN(value) ? 0 : value;
  await settings.saveShipmentDelay();
  setStatus("Shipment delay saved.", false);
}

export function initGeneralSettings() {
  loadGeneralSettings().catch((err) => setStatus(`Error: ${String(err)}`, true));

  saveClientIdButton?.addEventListener("click", () => {
    saveClientId().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });

  saveShipmentDelayButton?.addEventListener("click", () => {
    saveShipmentDelay().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
