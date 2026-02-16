import { getStorage } from "../storage.js";
import { Manufacturer } from "../types/index.js";
import { setStatus } from "./status.js";

const mfrRequiredKeys = ['contact', 'address1', 'city', 'postalCode', 'provinceState', 'country'] as const;
const mfrOptionalKeys = ['address2', 'phone', 'email'] as const;

interface ManufacturerHtmlElements {
  contact: HTMLInputElement | null,
  address1: HTMLInputElement | null,
  address2: HTMLInputElement | null,
  city: HTMLInputElement | null,
  postalCode: HTMLInputElement | null,
  provinceState: HTMLInputElement | null,
  country: HTMLInputElement | null,
  phone: HTMLInputElement | null,
  email: HTMLInputElement | null,
};

const inputElements: ManufacturerHtmlElements = {
  contact: document.getElementById('a-contact') as HTMLInputElement | null,
  address1: document.getElementById('a-address1') as HTMLInputElement | null,
  address2: document.getElementById('a-address2') as HTMLInputElement | null,
  city: document.getElementById('a-city') as HTMLInputElement | null,
  postalCode: document.getElementById('a-postal') as HTMLInputElement | null,
  provinceState: document.getElementById('a-province') as HTMLInputElement | null,
  country: document.getElementById('a-country') as HTMLInputElement | null,
  phone: document.getElementById('a-phone') as HTMLInputElement | null,
  email: document.getElementById('a-email') as HTMLInputElement | null,
};

const manufacturerList = document.getElementById('manufacturer-list') as HTMLUListElement | null;
const addManufacturerLink = document.getElementById('add-manufacturer-link') as HTMLButtonElement | null;
const addManufacturerForm = document.getElementById('add-manufacturer-form') as HTMLDivElement | null;
const addManufacturerButton = document.getElementById('add-manufacturer') as HTMLButtonElement | null;
const cancelAddButton = document.getElementById('cancel-add') as HTMLButtonElement | null;

function validateManufacturer(mfr: Manufacturer): boolean {
  // Check required fields
  for (let key of mfrRequiredKeys) {
    if (!mfr[key]) {
      return false;
    }
  }
  return true;
}

function readInputs(elements: ManufacturerHtmlElements): Manufacturer | null {
  const mfr = {
    isDefault: false,
  } as Manufacturer;
  
  const keys = [...mfrRequiredKeys, ...mfrOptionalKeys];
  for (let key of keys) {
    mfr[key] = elements[key]?.value.trim() || '';
  }
  if (!validateManufacturer(mfr)) {
    return null;
  }
  return mfr;
}

function clearInputs(elements: typeof inputElements) {
  const fields = [...mfrRequiredKeys, ...mfrOptionalKeys] as const;
  for (let key of fields) {
    elements[key]!.value = '';
  }
}

function formatSummary(mfr: Manufacturer, index: number) {
  const contact = mfr.contact || `Manufacturer ${index + 1}`;
  const address = [mfr.address1, mfr.address2].filter(Boolean).join(" ");
  const city = mfr.city || "";
  const region = mfr.provinceState || "";
  const country = mfr.country || "";

  const parts = [contact, address, city, region, country].filter(Boolean);
  const summary = parts.join(", ");
  return mfr.isDefault ? `${summary} (Default)` : summary;
}

function buildEditPanel(item: Manufacturer) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  const inputs = {
    contact: createInput("Contact", "text", item.contact, "Company/Individual name"),
    address1: createInput("Address Line 1", "text", item.address1),
    address2: createInput("Address Line 2", "text", item.address2, "Optional"),
    city: createInput("City", "text", item.city),
    postalCode: createInput("Postal Code", "text", item.postalCode),
    provinceState: createInput("Province/State", "text", item.provinceState),
    country: createInput("Country", "text", item.country),
    phone: createInput("Phone (Optional)", "text", item.phone || ""),
    email: createInput("Email (Optional)", "email", item.email || "")
  };
  inputs.contact.input.disabled = true;

  panel.appendChild(inputs.contact.wrapper);
  panel.appendChild(createRow([inputs.address1.wrapper, inputs.address2.wrapper]));
  panel.appendChild(createRow([inputs.city.wrapper, inputs.postalCode.wrapper]));
  panel.appendChild(createRow([inputs.provinceState.wrapper, inputs.country.wrapper]));
  panel.appendChild(createRow([inputs.phone.wrapper, inputs.email.wrapper]));

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    const updated: Manufacturer = {
      contact: inputs.contact.input.value.trim(),
      address1: inputs.address1.input.value.trim(),
      address2: inputs.address2.input.value.trim(),
      city: inputs.city.input.value.trim(),
      postalCode: inputs.postalCode.input.value.trim(),
      provinceState: inputs.provinceState.input.value.trim(),
      country: inputs.country.input.value.trim(),
      phone: inputs.phone.input.value.trim(),
      email: inputs.email.input.value.trim(),
      isDefault: item.isDefault
    };
    if (!updated.contact) {
      setStatus("Contact is required.", true);
      return;
    }
    updateManufacturer(updated).catch((err) => setStatus(`Error: ${String(err)}`, true));
  });

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    panel.classList.add("hidden");
  });

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  panel.appendChild(actions);

  return panel;
}

function createRow(elements: HTMLElement[]) {
  const row = document.createElement("div");
  row.className = "row";
  elements.forEach((el) => row.appendChild(el));
  return row;
}

function createInput(labelText: string, type: string, value: string, placeholder?: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = type;
  input.value = value || "";
  if (placeholder) input.placeholder = placeholder;
  wrapper.appendChild(input);

  return { wrapper, input };
}

function renderManufacturers(mfrs: Manufacturer[]) {
  if (!manufacturerList) return;
  manufacturerList.innerHTML = "";

  mfrs.forEach((mfr, index) => {
    const li = document.createElement("li");

    const summaryRow = document.createElement("div");
    summaryRow.className = "list-item";

    const summary = document.createElement("div");
    summary.className = "summary";
    summary.textContent = formatSummary(mfr, index);
    // Bold default manufacturer
    if (mfr.isDefault) {
      summary.classList.add("bold");
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const defaultButton = document.createElement("button");
    defaultButton.textContent = mfr.isDefault ? "Default" : "Set Default";
    defaultButton.disabled = Boolean(mfr.isDefault);
    defaultButton.addEventListener("click", () => {
      setDefaultManufacturer(mfr.contact).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removeManufacturer(mfr.contact).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });
    deleteButton.disabled = Boolean(mfr.isDefault);

    actions.appendChild(defaultButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    summaryRow.appendChild(summary);
    summaryRow.appendChild(actions);

    const panel = buildEditPanel(mfr);
    panel.classList.add("hidden");

    editButton.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      editButton.textContent = panel.classList.contains("hidden") ? "Edit" : "Close";
    });

    li.appendChild(summaryRow);
    li.appendChild(panel);
    manufacturerList.appendChild(li);
  });
}

async function loadManufacturers() {
  const storage = await getStorage();
  renderManufacturers(storage.getSortedManufacturerList());
}

async function addManufacturer() {
  const newMfr = readInputs(inputElements);
  if (!newMfr) {
    setStatus('Missing required manufacturer fields', true);
    return;
  }

  const storage = await getStorage();
  try {
    await storage.createManufacturer(newMfr);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Creating manufacturer ${newMfr.contact} failed: ${err.message}`, true);
    }
    return;
  }

  renderManufacturers(storage.getSortedManufacturerList());
  clearInputs(inputElements);
  toggleAddForm(false);
  setStatus(`Manufacturer ${newMfr.contact} created.`, false);
}

async function removeManufacturer(contact: string) {
  const storage = await getStorage();
  try {
    await storage.deleteManufacturer(contact);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Removing manufacturer ${contact} failed: ${err.message}`, true);
    }
    return;
  }

  renderManufacturers(storage.getSortedManufacturerList());
  setStatus(`Manufacturer ${contact} removed.`, false);
}

async function updateManufacturer(updated: Manufacturer) {
  const storage = await getStorage();
  try {
    await storage.updateManufacturer(updated);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Updating manufacturer ${updated.contact} failed: ${err.message}`, true);
    }
    return;
  }

  renderManufacturers(storage.getSortedManufacturerList());
  setStatus(`Manufacturer ${updated.contact} saved.`, false);
}

async function setDefaultManufacturer(contact: string) {
  const storage = await getStorage();
  try {
    await storage.setDefaultManufacturer(contact);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Updating manufacturer ${contact} failed: ${err.message}`, true);
    }
    return;
  }

  renderManufacturers(storage.getSortedManufacturerList());
  setStatus(`Manufacturer ${contact} is successfully set as default.`, false);
}

function toggleAddForm(show: boolean) {
  if (!addManufacturerForm) return;
  addManufacturerForm.classList.toggle("hidden", !show);
  if (!show) clearInputs(inputElements);
}

export function initManufacturers() {
  loadManufacturers().catch((err) => setStatus(`Error: ${String(err)}`, true));

  addManufacturerLink?.addEventListener("click", () => {
    toggleAddForm(true);
  });

  cancelAddButton?.addEventListener("click", () => {
    toggleAddForm(false);
  });

  addManufacturerButton?.addEventListener("click", () => {
    addManufacturer().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
