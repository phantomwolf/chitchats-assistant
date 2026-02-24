import { getSettings } from "../utils/settings.js";
import { ProductMatcher, WeightUnit } from "../types/index.js";
import { setStatus } from "./status.js";

const prdRequiredKeys = ['name', 'description', 'manufacturer', 'weight', 'weightUnit', 'originCountry', 'hsCode'] as const;
const prdOptionalKeys = ['steel', 'aluminum'] as const;

interface ProductHtmlElements {
  name: HTMLInputElement | null,
  isRegex: HTMLInputElement | null,
  isCaseSensitive: HTMLInputElement | null,
  description: HTMLInputElement | null,
  manufacturer: HTMLSelectElement | null,
  weight: HTMLInputElement | null,
  weightUnit: HTMLSelectElement | null,
  originCountry: HTMLInputElement | null,
  hsCode: HTMLInputElement | null,
  steel: HTMLInputElement | null,
  aluminum: HTMLInputElement | null,
}

const inputElements: ProductHtmlElements = {
  name: document.getElementById("p-name") as HTMLInputElement | null,
  isRegex: document.getElementById("p-name-is-regex") as HTMLInputElement | null,
  isCaseSensitive: document.getElementById("p-name-is-case-sensitive") as HTMLInputElement | null,
  description: document.getElementById("p-description") as HTMLInputElement | null,
  manufacturer: document.getElementById("p-manufacturer") as HTMLSelectElement | null,
  weight: document.getElementById("p-weight") as HTMLInputElement | null,
  weightUnit: document.getElementById("p-weight-unit") as HTMLSelectElement | null,
  originCountry: document.getElementById("p-origin-country") as HTMLInputElement | null,
  hsCode: document.getElementById("p-hs-code") as HTMLInputElement | null,
  steel: document.getElementById("p-steel") as HTMLInputElement | null,
  aluminum: document.getElementById("p-aluminum") as HTMLInputElement | null
};

const productList = document.getElementById("product-list") as HTMLUListElement | null;
const defaultProductEnabledSwitch = document.getElementById("p-default-product-enabled") as HTMLInputElement | null;
const addProductLink = document.getElementById("add-product-link") as HTMLButtonElement | null;
const addProductForm = document.getElementById("add-product-form") as HTMLDivElement | null;
const addProductButton = document.getElementById("add-product") as HTMLButtonElement | null;
const cancelAddProductButton = document.getElementById("cancel-add-product") as HTMLButtonElement | null;
let manufacturerContacts: string[] = [];

function validateProduct(product: ProductMatcher): boolean {
  // Check required fields
  for (let key of prdRequiredKeys) {
    if (!product[key]) {
      return false;
    }
  }
  return true;
}

function readInputs(source: ProductHtmlElements): ProductMatcher | null {
  const weight = Number(source.weight?.value.trim() || "0");
  const steel = Number(source.steel?.value.trim() || "0");
  const aluminum = Number(source.aluminum?.value.trim() || "0");

  const product: ProductMatcher = {
    name: source.name?.value.trim() || "",
    isRegex: source.isRegex?.checked || false,
    isCaseSensitive: source.isCaseSensitive?.checked || false,
    manufacturer: source.manufacturer?.value.trim() || "",
    description: source.description?.value.trim() || "",
    weight: Number.isFinite(weight) ? weight : 0,
    weightUnit: (source.weightUnit?.value || WeightUnit.G) as WeightUnit,
    originCountry: source.originCountry?.value.trim() || "",
    hsCode: source.hsCode?.value.trim() || "",
    steel: Number.isFinite(steel) ? steel : 0,
    aluminum: Number.isFinite(aluminum) ? aluminum : 0
  };

  if (!validateProduct(product)) {
    return null;
  }
  return product;
}

function clearInputs(elements: ProductHtmlElements) {
  elements.name!.value = "";
  elements.isRegex!.checked = false;
  elements.isCaseSensitive!.checked = false;
  elements.description!.value = "";
  elements.manufacturer!.selectedIndex = 0;
  elements.weight!.value = "";
  elements.weightUnit!.value = WeightUnit.G;
  elements.originCountry!.value = "";
  elements.hsCode!.value = "";
  elements.steel!.value = "";
  elements.aluminum!.value = "";
}

function formatSummary(item: ProductMatcher, index: number) {
  const name = item.name || `Product ${index + 1}`;
  const weight = item.weight ? `${item.weight} ${item.weightUnit}` : "";
  const origin = item.originCountry || "";
  const hs = item.hsCode || "";

  const parts = [name, weight, origin, hs].filter(Boolean);
  return parts.join(", ");
}

function buildEditPanel(item: ProductMatcher) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  const inputs = {
    name: createInput("Name", "text", item.name),
    isRegex: createCheckbox("Is Regex", item.isRegex),
    isCaseSensitive: createCheckbox("Case Sensitive", item.isCaseSensitive),
    description: createInput("Description", "text", item.description),
    manufacturer: createSelect("Manufacturer", manufacturerContacts, item.manufacturer),
    weight: createInput("Weight", "number", String(item.weight ?? "")),
    weightUnit: createSelect("Weight Unit", [WeightUnit.G, WeightUnit.KG, WeightUnit.LB, WeightUnit.OZ], item.weightUnit),
    originCountry: createInput("Origin Country", "text", item.originCountry),
    hsCode: createInput("HS Code", "text", item.hsCode),
    steel: createInput("Steel", "number", String(item.steel ?? "")),
    aluminum: createInput("Aluminum", "number", String(item.aluminum ?? ""))
  };
  inputs.name.input.disabled = true;

  panel.appendChild(createRow([inputs.name.wrapper, inputs.isRegex.wrapper, inputs.isCaseSensitive.wrapper]));
  panel.appendChild(inputs.description.wrapper);
  panel.appendChild(inputs.manufacturer.wrapper);
  panel.appendChild(createRow([inputs.weight.wrapper, inputs.weightUnit.wrapper]));
  panel.appendChild(createRow([inputs.originCountry.wrapper, inputs.hsCode.wrapper]));
  panel.appendChild(createRow([inputs.steel.wrapper, inputs.aluminum.wrapper]));

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    const updated: ProductMatcher = {
      name: inputs.name.input.value.trim(),
      isRegex: inputs.isRegex.input.checked,
      isCaseSensitive: inputs.isCaseSensitive.input.checked,
      manufacturer: inputs.manufacturer.select.value,
      description: inputs.description.input.value.trim(),
      weight: Number(inputs.weight.input.value || 0),
      weightUnit: inputs.weightUnit.select.value as WeightUnit,
      originCountry: inputs.originCountry.input.value.trim(),
      hsCode: inputs.hsCode.input.value.trim(),
      steel: Number(inputs.steel.input.value || 0),
      aluminum: Number(inputs.aluminum.input.value || 0)
    };
    if (!updated.name) {
      setStatus("Name is required.", true);
      return;
    }
    updateProduct(updated).catch((err) => setStatus(`Error: ${String(err)}`, true));
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

function createInput(labelText: string, type: string, value: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = type;
  input.value = value || "";
  wrapper.appendChild(input);

  return { wrapper, input };
}

function createSelect(labelText: string, options: string[], value: string) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const select = document.createElement("select");
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
  select.value = value || options[0];
  wrapper.appendChild(select);

  return { wrapper, select };
}

function createCheckbox(labelText: string, checked: boolean) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const switchLabel = document.createElement("label");
  switchLabel.className = "switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  switchLabel.appendChild(input);

  const slider = document.createElement("span");
  slider.className = "switch-slider";
  switchLabel.appendChild(slider);

  wrapper.appendChild(switchLabel);

  return { wrapper, input };
}

function setManufacturerOptions(contacts: string[]) {
  const select = inputElements.manufacturer;
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = "";
  contacts.forEach((contact) => {
    const option = document.createElement("option");
    option.value = contact;
    option.textContent = contact;
    select.appendChild(option);
  });

  if (contacts.length > 0) {
    select.value = contacts.includes(currentValue) ? currentValue : contacts[0];
  }
}

function renderProducts(items: ProductMatcher[]) {
  const list = productList;
  if (!list) return;
  list.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");

    const summaryRow = document.createElement("div");
    summaryRow.className = "list-item";

    const summary = document.createElement("div");
    summary.className = "summary";
    summary.textContent = formatSummary(item, index);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removeProduct(item.name).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    summaryRow.appendChild(summary);
    summaryRow.appendChild(actions);

    const panel = buildEditPanel(item);
    panel.classList.add("hidden");

    editButton.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      editButton.textContent = panel.classList.contains("hidden") ? "Edit" : "Close";
    });

    li.appendChild(summaryRow);
    li.appendChild(panel);
    list.appendChild(li);
  });
}

async function loadProducts() {
  const storage = await getSettings();
  manufacturerContacts = storage.getSortedManufacturerList().map((mfr) => mfr.contact);
  setManufacturerOptions(manufacturerContacts);
  if (defaultProductEnabledSwitch) {
    defaultProductEnabledSwitch.checked = storage.isDefaultProductEnabled;
  }
  renderProducts(Object.values(storage.products));
}

async function updateIsDefaultProductEnabled(enabled: boolean) {
  const storage = await getSettings();
  storage.isDefaultProductEnabled = enabled;
  await storage.saveIsDefaultProductEnabled();
}

async function addProduct() {
  const newProduct = readInputs(inputElements);
  if (!newProduct) {
    setStatus("Missing required product fields", true);
    return;
  }

  const storage = await getSettings();
  manufacturerContacts = storage.getSortedManufacturerList().map((mfr) => mfr.contact);
  setManufacturerOptions(manufacturerContacts);
  try {
    await storage.createProduct(newProduct);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Creating product ${newProduct.name} failed: ${err.message}`, true);
    }
    return;
  }

  renderProducts(Object.values(storage.products));
  clearInputs(inputElements);
  toggleAddForm(false);
  setStatus(`Product ${newProduct.name} created.`, false);
}

async function removeProduct(key: string) {
  const storage = await getSettings();
  manufacturerContacts = storage.getSortedManufacturerList().map((mfr) => mfr.contact);
  setManufacturerOptions(manufacturerContacts);
  try {
    await storage.deleteProduct(key);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Removing product ${key} failed: ${err.message}`, true);
    }
    return;
  }

  renderProducts(Object.values(storage.products));
  setStatus(`Product ${key} removed.`, false);
}

async function updateProduct(updated: ProductMatcher) {
  const storage = await getSettings();
  manufacturerContacts = storage.getSortedManufacturerList().map((mfr) => mfr.contact);
  setManufacturerOptions(manufacturerContacts);
  try {
    await storage.updateProduct(updated);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Updating product ${updated.name} failed: ${err.message}`, true);
    }
    return;
  }

  renderProducts(Object.values(storage.products));
  setStatus(`Product ${updated.name} saved.`, false);
}

function toggleAddForm(show: boolean) {
  if (!addProductForm) return;
  addProductForm.classList.toggle("hidden", !show);
  if (!show) clearInputs(inputElements);
}

export function initProducts() {
  loadProducts().catch((err) => setStatus(`Error: ${String(err)}`, true));

  addProductLink?.addEventListener("click", () => {
    toggleAddForm(true);
  });

  cancelAddProductButton?.addEventListener("click", () => {
    toggleAddForm(false);
  });

  defaultProductEnabledSwitch?.addEventListener("change", () => {
    updateIsDefaultProductEnabled(defaultProductEnabledSwitch.checked).catch((err) => setStatus(`Error: ${String(err)}`, true));
  });

  addProductButton?.addEventListener("click", () => {
    addProduct().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
