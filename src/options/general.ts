import { setStatus } from "./status.js";
import { getSettings } from "../utils/settings.js";

const clientIdInput = document.getElementById("general-client-id") as HTMLInputElement | null;
const saveClientIdButton = document.getElementById("save-client-id") as HTMLButtonElement | null;

async function loadGeneralSettings() {
  if (!clientIdInput) return;
  const settings = await getSettings();
  clientIdInput.value = settings.chitchatsClientId || "";
}

async function saveGeneralSettings() {
  const settings = await getSettings();
  const value = clientIdInput?.value.trim() || "";
  settings.chitchatsClientId = value;
  await settings.saveChitchatsClientId();
  setStatus("General settings saved.", false);
}

export function initGeneralSettings() {
  loadGeneralSettings().catch((err) => setStatus(`Error: ${String(err)}`, true));

  saveClientIdButton?.addEventListener("click", () => {
    saveGeneralSettings().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
