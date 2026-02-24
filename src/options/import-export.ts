import { setStatus } from "./status.js";

const exportSettingsButton = document.getElementById("export-settings") as HTMLButtonElement | null;
const importSettingsButton = document.getElementById("import-settings") as HTMLButtonElement | null;
const importFileInput = document.getElementById("import-file") as HTMLInputElement | null;

function makeExportFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `chitchats-sync-${timestamp}.json`;
}

async function exportSettings() {
  const allSettings = await chrome.storage.sync.get(null);
  const payload = JSON.stringify(allSettings, null, 2);

  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = makeExportFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus("Settings exported.", false);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function importSettingsFromFile(file: File) {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    setStatus("Invalid JSON file.", true);
    return;
  }

  if (!isPlainObject(parsed)) {
    setStatus("Imported JSON must be an object.", true);
    return;
  }

  await chrome.storage.sync.clear();
  await chrome.storage.sync.set(parsed);
  setStatus("Settings imported. Reloading...", false);
  window.setTimeout(() => window.location.reload(), 200);
}

export function initImportExport() {
  exportSettingsButton?.addEventListener("click", () => {
    exportSettings().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });

  importSettingsButton?.addEventListener("click", () => {
    importFileInput?.click();
  });

  importFileInput?.addEventListener("change", () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    importSettingsFromFile(file).catch((err) => setStatus(`Error: ${String(err)}`, true));
    importFileInput.value = "";
  });
}
