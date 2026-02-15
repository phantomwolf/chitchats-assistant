import { Product, WeightUnit } from "../types/index.js";

let addInputs = {
  name: null as HTMLInputElement | null,
  description: null as HTMLInputElement | null,
  weight: null as HTMLInputElement | null,
  weightUnit: null as HTMLSelectElement | null,
  originCountry: null as HTMLInputElement | null,
  hsCode: null as HTMLInputElement | null,
  steel: null as HTMLInputElement | null,
  aluminum: null as HTMLInputElement | null
};

let productList: HTMLUListElement | null = null;
let addProductLink: HTMLButtonElement | null = null;
let addProductForm: HTMLDivElement | null = null;
let addProductButton: HTMLButtonElement | null = null;
let cancelAddProductButton: HTMLButtonElement | null = null;

function bindElements() {
  addInputs = {
    name: document.getElementById("p-name") as HTMLInputElement | null,
    description: document.getElementById("p-description") as HTMLInputElement | null,
    weight: document.getElementById("p-weight") as HTMLInputElement | null,
    weightUnit: document.getElementById("p-weight-unit") as HTMLSelectElement | null,
    originCountry: document.getElementById("p-origin-country") as HTMLInputElement | null,
    hsCode: document.getElementById("p-hs-code") as HTMLInputElement | null,
    steel: document.getElementById("p-steel") as HTMLInputElement | null,
    aluminum: document.getElementById("p-aluminum") as HTMLInputElement | null
  };

  productList = document.getElementById("product-list") as HTMLUListElement | null;
  addProductLink = document.getElementById("add-product-link") as HTMLButtonElement | null;
  addProductForm = document.getElementById("add-product-form") as HTMLDivElement | null;
  addProductButton = document.getElementById("add-product") as HTMLButtonElement | null;
  cancelAddProductButton = document.getElementById("cancel-add-product") as HTMLButtonElement | null;
}

const defaultProduct: Product = {
  name: "",
  description: "",
  weight: 0,
  weightUnit: WeightUnit.G,
  originCountry: "",
  hsCode: "",
  steel: 0,
  aluminum: 0
};

function readInputs(source: typeof addInputs): Product {
  const weight = Number(source.weight?.value || 0);
  const steel = Number(source.steel?.value || 0);
  const aluminum = Number(source.aluminum?.value || 0);

  return {
    name: source.name?.value.trim() || "",
    description: source.description?.value.trim() || "",
    weight: Number.isFinite(weight) ? weight : 0,
    weightUnit: (source.weightUnit?.value || WeightUnit.G) as WeightUnit,
    originCountry: source.originCountry?.value.trim() || "",
    hsCode: source.hsCode?.value.trim() || "",
    steel: Number.isFinite(steel) ? steel : 0,
    aluminum: Number.isFinite(aluminum) ? aluminum : 0
  };
}

function writeInputs(target: typeof addInputs, info: Product) {
  if (target.name) target.name.value = info.name;
  if (target.description) target.description.value = info.description;
  if (target.weight) target.weight.value = String(info.weight ?? "");
  if (target.weightUnit) target.weightUnit.value = info.weightUnit;
  if (target.originCountry) target.originCountry.value = info.originCountry;
  if (target.hsCode) target.hsCode.value = info.hsCode;
  if (target.steel) target.steel.value = String(info.steel ?? "");
  if (target.aluminum) target.aluminum.value = String(info.aluminum ?? "");
}

function clearInputs(target: typeof addInputs) {
  writeInputs(target, defaultProduct);
}

function formatSummary(item: Product, index: number) {
  const name = item.name || `Product ${index + 1}`;
  const weight = item.weight ? `${item.weight} ${item.weightUnit}` : "";
  const origin = item.originCountry || "";
  const hs = item.hsCode || "";

  const parts = [name, weight, origin, hs].filter(Boolean);
  return parts.join(", ");
}

function buildEditPanel(item: Product, key: string, setStatus: (message: string, isError?: boolean) => void) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  const inputs = {
    name: createInput("Name", "text", item.name),
    description: createInput("Description", "text", item.description),
    weight: createInput("Weight", "number", String(item.weight ?? "")),
    weightUnit: createSelect("Weight Unit", [WeightUnit.G, WeightUnit.KG, WeightUnit.LB, WeightUnit.OZ], item.weightUnit),
    originCountry: createInput("Origin Country", "text", item.originCountry),
    hsCode: createInput("HS Code", "text", item.hsCode),
    steel: createInput("Steel", "number", String(item.steel ?? "")),
    aluminum: createInput("Aluminum", "number", String(item.aluminum ?? ""))
  };

  panel.appendChild(inputs.name.wrapper);
  panel.appendChild(inputs.description.wrapper);
  panel.appendChild(createRow([inputs.weight.wrapper, inputs.weightUnit.wrapper]));
  panel.appendChild(createRow([inputs.originCountry.wrapper, inputs.hsCode.wrapper]));
  panel.appendChild(createRow([inputs.steel.wrapper, inputs.aluminum.wrapper]));

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    const updated: Product = {
      name: inputs.name.input.value.trim(),
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
    updateProduct(key, updated, setStatus).catch((err) => setStatus(`Error: ${String(err)}`, true));
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

function normalizeProducts(items: Product[]) {
  return items.map((item) => ({
    ...defaultProduct,
    ...item
  }));
}

function itemsToEntries(items: Product[]) {
  return items
    .slice()
    .map((item) => ({
      key: item.name,
      item
    }));
}

function toMap(items: Product[]) {
  const map: Record<string, Product> = {};
  items.forEach((item) => {
    map[item.name] = item;
  });
  return map;
}

function renderProducts(items: Product[], setStatus: (message: string, isError?: boolean) => void) {
  const list = productList;
  if (!list) return;
  list.innerHTML = "";

  const entries = itemsToEntries(items);

  entries.forEach((entry, index) => {
    const item = entry.item;
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
      removeProduct(entry.key, setStatus).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    summaryRow.appendChild(summary);
    summaryRow.appendChild(actions);

    const panel = buildEditPanel(item, entry.key, setStatus);
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

async function loadProducts(setStatus: (message: string, isError?: boolean) => void) {
  const result = await chrome.storage.sync.get({ products: {} });
  const products = normalizeProducts(Object.values(result.products as Record<string, Product>));
  await chrome.storage.sync.set({ products: toMap(products) });
  renderProducts(products, setStatus);
}

async function addProduct(setStatus: (message: string, isError?: boolean) => void) {
  const newProduct = readInputs(addInputs);
  if (!newProduct.name) {
    setStatus("Name is required.", true);
    return;
  }
  const result = await chrome.storage.sync.get({ products: {} });
  const products = normalizeProducts(Object.values(result.products as Record<string, Product>));
  products.push(newProduct);
  await chrome.storage.sync.set({ products: toMap(products) });
  renderProducts(products, setStatus);
  clearInputs(addInputs);
  toggleAddForm(false);
  setStatus("Added.", false);
}

async function removeProduct(key: string, setStatus: (message: string, isError?: boolean) => void) {
  const result = await chrome.storage.sync.get({ products: {} });
  const products = result.products as Record<string, Product>;
  delete products[key];
  await chrome.storage.sync.set({ products });
  renderProducts(normalizeProducts(Object.values(products)), setStatus);
  setStatus("Removed.", false);
}

async function updateProduct(key: string, updated: Product, setStatus: (message: string, isError?: boolean) => void) {
  const result = await chrome.storage.sync.get({ products: {} });
  const products = result.products as Record<string, Product>;
  if (key !== updated.name && products[key]) {
    delete products[key];
  }
  products[updated.name] = updated;
  await chrome.storage.sync.set({ products });
  renderProducts(normalizeProducts(Object.values(products)), setStatus);
  setStatus("Saved.", false);
}

function toggleAddForm(show: boolean) {
  if (!addProductForm) return;
  addProductForm.classList.toggle("hidden", !show);
  if (!show) clearInputs(addInputs);
}

export function initProducts(setStatus: (message: string, isError?: boolean) => void) {
  bindElements();
  loadProducts(setStatus).catch((err) => setStatus(`Error: ${String(err)}`, true));

  addProductLink?.addEventListener("click", () => {
    toggleAddForm(true);
  });

  cancelAddProductButton?.addEventListener("click", () => {
    toggleAddForm(false);
  });

  addProductButton?.addEventListener("click", () => {
    addProduct(setStatus).catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
