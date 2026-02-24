import { getSettings } from "../utils/settings.js";
import { LengthUnit, Package, PackageType, WeightUnit } from "../types/index.js";
import { setStatus } from "./status.js";

const pkgRequiredKeys = ["type", "toWeight", "weightUnit", "length", "width", "height", "lengthUnit"] as const;

interface PackageHtmlElements {
  type: HTMLSelectElement | null,
  fromWeight: HTMLInputElement | null,
  toWeight: HTMLInputElement | null,
  weightUnit: HTMLSelectElement | null,
  length: HTMLInputElement | null,
  width: HTMLInputElement | null,
  height: HTMLInputElement | null,
  lengthUnit: HTMLSelectElement | null,
}

const inputElements: PackageHtmlElements = {
  type: document.getElementById("k-type") as HTMLSelectElement | null,
  fromWeight: document.getElementById("k-from-weight") as HTMLInputElement | null,
  toWeight: document.getElementById("k-to-weight") as HTMLInputElement | null,
  weightUnit: document.getElementById("k-weight-unit") as HTMLSelectElement | null,
  length: document.getElementById("k-length") as HTMLInputElement | null,
  width: document.getElementById("k-width") as HTMLInputElement | null,
  height: document.getElementById("k-height") as HTMLInputElement | null,
  lengthUnit: document.getElementById("k-length-unit") as HTMLSelectElement | null,
};

const packageList = document.getElementById("package-list") as HTMLUListElement | null;
const addPackageLink = document.getElementById("add-package-link") as HTMLButtonElement | null;
const addPackageForm = document.getElementById("add-package-form") as HTMLDivElement | null;
const addPackageButton = document.getElementById("add-package") as HTMLButtonElement | null;
const cancelAddPackageButton = document.getElementById("cancel-add-package") as HTMLButtonElement | null;

function validatePackage(pkg: Package): boolean {
  for (const key of pkgRequiredKeys) {
    if (!pkg[key]) {
      return false;
    }
  }
  return pkg.fromWeight <= pkg.toWeight;
}

function readInputs(source: PackageHtmlElements): Package | null {
  const fromWeight = Number(source.fromWeight?.value.trim() || "0");
  const toWeight = Number(source.toWeight?.value.trim() || "0");
  const length = Number(source.length?.value.trim() || "0");
  const width = Number(source.width?.value.trim() || "0");
  const height = Number(source.height?.value.trim() || "0");

  const pkg: Package = {
    type: (source.type?.value || PackageType.Parcel) as PackageType,
    fromWeight: Number.isFinite(fromWeight) ? fromWeight : 0,
    toWeight: Number.isFinite(toWeight) ? toWeight : 0,
    weightUnit: (source.weightUnit?.value || WeightUnit.G) as WeightUnit,
    length: Number.isFinite(length) ? length : 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
    lengthUnit: (source.lengthUnit?.value || LengthUnit.CM) as LengthUnit,
  };

  if (!validatePackage(pkg)) {
    return null;
  }
  return pkg;
}

function clearInputs(elements: PackageHtmlElements) {
  elements.type!.value = PackageType.Parcel;
  elements.fromWeight!.value = "";
  elements.toWeight!.value = "";
  elements.weightUnit!.value = WeightUnit.G;
  elements.length!.value = "";
  elements.width!.value = "";
  elements.height!.value = "";
  elements.lengthUnit!.value = LengthUnit.CM;
}

function formatSummary(item: Package) {
  return `${item.type}, ${item.fromWeight}-${item.toWeight} ${item.weightUnit}, ${item.length}x${item.width}x${item.height} ${item.lengthUnit}`;
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

function buildEditPanel(item: Package, index: number) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  const inputs = {
    type: createSelect("Type", [PackageType.Letter, PackageType.FlatEnvelope, PackageType.ThickEnvelope, PackageType.Parcel], item.type),
    fromWeight: createInput("From Weight", "number", String(item.fromWeight ?? "")),
    toWeight: createInput("To Weight", "number", String(item.toWeight ?? "")),
    weightUnit: createSelect("Weight Unit", [WeightUnit.G, WeightUnit.KG, WeightUnit.LB, WeightUnit.OZ], item.weightUnit),
    length: createInput("Length", "number", String(item.length ?? "")),
    width: createInput("Width", "number", String(item.width ?? "")),
    height: createInput("Height", "number", String(item.height ?? "")),
    lengthUnit: createSelect("Length Unit", [LengthUnit.CM, LengthUnit.IN], item.lengthUnit),
  };

  panel.appendChild(createRow([inputs.fromWeight.wrapper, inputs.toWeight.wrapper, inputs.weightUnit.wrapper]));
  panel.appendChild(inputs.type.wrapper);
  panel.appendChild(inputs.lengthUnit.wrapper);
  panel.appendChild(createRow([inputs.length.wrapper, inputs.width.wrapper]));
  panel.appendChild(inputs.height.wrapper);

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    const updated: Package = {
      type: inputs.type.select.value as PackageType,
      fromWeight: Number(inputs.fromWeight.input.value || 0),
      toWeight: Number(inputs.toWeight.input.value || 0),
      weightUnit: inputs.weightUnit.select.value as WeightUnit,
      length: Number(inputs.length.input.value || 0),
      width: Number(inputs.width.input.value || 0),
      height: Number(inputs.height.input.value || 0),
      lengthUnit: inputs.lengthUnit.select.value as LengthUnit,
    };
    if (!validatePackage(updated)) {
      setStatus("Missing required package fields", true);
      return;
    }
    updatePackage(index, updated).catch((err) => setStatus(`Error: ${String(err)}`, true));
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

function renderPackages(items: Package[]) {
  if (!packageList) return;
  packageList.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");

    const summaryRow = document.createElement("div");
    summaryRow.className = "list-item";

    const summary = document.createElement("div");
    summary.className = "summary";
    summary.textContent = formatSummary(item);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removePackage(index).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    summaryRow.appendChild(summary);
    summaryRow.appendChild(actions);

    const panel = buildEditPanel(item, index);
    panel.classList.add("hidden");
    editButton.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      editButton.textContent = panel.classList.contains("hidden") ? "Edit" : "Close";
    });

    li.appendChild(summaryRow);
    li.appendChild(panel);
    packageList.appendChild(li);
  });
}

async function loadPackages() {
  const storage = await getSettings();
  renderPackages(storage.packages);
}

async function addPackage() {
  const pkg = readInputs(inputElements);
  if (!pkg) {
    setStatus("Missing required package fields", true);
    return;
  }

  const storage = await getSettings();
  try {
    await storage.createPackage(pkg);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Creating package ${pkg.type} failed: ${err.message}`, true);
    }
    return;
  }

  renderPackages(storage.packages);
  clearInputs(inputElements);
  toggleAddForm(false);
  setStatus(`Package ${pkg.type} created.`, false);
}

async function removePackage(index: number) {
  const storage = await getSettings();
  try {
    await storage.deletePackage(index);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Removing package failed: ${err.message}`, true);
    }
    return;
  }

  renderPackages(storage.packages);
  setStatus(`Package removed.`, false);
}

async function updatePackage(index: number, updated: Package) {
  const storage = await getSettings();
  try {
    await storage.updatePackage(index, updated);
  } catch (err) {
    if (err instanceof Error) {
      setStatus(`Updating package ${updated.type} failed: ${err.message}`, true);
    }
    return;
  }

  renderPackages(storage.packages);
  setStatus(`Package ${updated.type} saved.`, false);
}

function toggleAddForm(show: boolean) {
  if (!addPackageForm) return;
  addPackageForm.classList.toggle("hidden", !show);
  if (!show) clearInputs(inputElements);
}

export function initPackages() {
  loadPackages().catch((err) => setStatus(`Error: ${String(err)}`, true));

  addPackageLink?.addEventListener("click", () => {
    toggleAddForm(true);
  });

  cancelAddPackageButton?.addEventListener("click", () => {
    toggleAddForm(false);
  });

  addPackageButton?.addEventListener("click", () => {
    addPackage().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
