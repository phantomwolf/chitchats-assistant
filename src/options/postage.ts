import { getSettings } from "../utils/settings.js";
import { Postage } from "../types/index.js";
import { setStatus } from "./status.js";

interface PostageHtmlElements {
  name: HTMLInputElement | null,
}

const inputElements: PostageHtmlElements = {
  name: document.getElementById("s-name") as HTMLInputElement | null,
};

const postageList = document.getElementById("postage-list") as HTMLUListElement | null;
const addPostageLink = document.getElementById("add-postage-link") as HTMLButtonElement | null;
const addPostageForm = document.getElementById("add-postage-form") as HTMLDivElement | null;
const addPostageButton = document.getElementById("add-postage") as HTMLButtonElement | null;
const cancelAddPostageButton = document.getElementById("cancel-add-postage") as HTMLButtonElement | null;

function validatePostage(postage: Postage): boolean {
  return Boolean(postage.name);
}

function readInputs(source: PostageHtmlElements): Postage | null {
  const postage: Postage = {
    name: source.name?.value.trim() || "",
  };
  if (!validatePostage(postage)) {
    return null;
  }
  return postage;
}

function clearInputs(elements: PostageHtmlElements) {
  elements.name!.value = "";
}

function buildEditPanel(item: Postage, index: number) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = "Name";
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.value = item.name;
  wrapper.appendChild(input);

  panel.appendChild(wrapper);

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    const updated: Postage = { name: input.value.trim() };
    if (!validatePostage(updated)) {
      setStatus("Postage name is required.", true);
      return;
    }
    updatePostage(index, updated).catch((err) => setStatus(`Error: ${String(err)}`, true));
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

function renderPostages(items: Postage[]) {
  if (!postageList) return;
  postageList.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");

    const summaryRow = document.createElement("div");
    summaryRow.className = "list-item";

    const summary = document.createElement("div");
    summary.className = "summary";
    summary.textContent = item.name || `Postage ${index + 1}`;

    const actions = document.createElement("div");
    actions.className = "actions";

    const upButton = document.createElement("button");
    upButton.textContent = "↑";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => {
      movePostage(index, -1).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    const downButton = document.createElement("button");
    downButton.textContent = "↓";
    downButton.disabled = index === items.length - 1;
    downButton.addEventListener("click", () => {
      movePostage(index, 1).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      removePostage(index).catch((err) => setStatus(`Error: ${String(err)}`, true));
    });

    actions.appendChild(upButton);
    actions.appendChild(downButton);
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
    postageList.appendChild(li);
  });
}

async function loadPostages() {
  const storage = await getSettings();
  renderPostages(storage.postages);
}

async function addPostage() {
  const postage = readInputs(inputElements);
  if (!postage) {
    setStatus("Postage name is required.", true);
    return;
  }

  const storage = await getSettings();
  await storage.createPostage(postage);
  renderPostages(storage.postages);
  clearInputs(inputElements);
  toggleAddForm(false);
  setStatus(`Postage ${postage.name} created.`, false);
}

async function removePostage(index: number) {
  const storage = await getSettings();
  await storage.deletePostage(index);
  renderPostages(storage.postages);
  setStatus("Postage removed.", false);
}

async function updatePostage(index: number, updated: Postage) {
  const storage = await getSettings();
  await storage.updatePostage(index, updated);
  renderPostages(storage.postages);
  setStatus(`Postage ${updated.name} saved.`, false);
}

async function movePostage(index: number, direction: -1 | 1) {
  const storage = await getSettings();
  const toIndex = index + direction;
  if (toIndex < 0 || toIndex >= storage.postages.length) {
    return;
  }

  const list = storage.postages;
  [list[index], list[toIndex]] = [list[toIndex], list[index]];
  await storage.savePostages();
  renderPostages(list);
}

function toggleAddForm(show: boolean) {
  if (!addPostageForm) return;
  addPostageForm.classList.toggle("hidden", !show);
  if (!show) clearInputs(inputElements);
}

export function initPostages() {
  loadPostages().catch((err) => setStatus(`Error: ${String(err)}`, true));

  addPostageLink?.addEventListener("click", () => {
    toggleAddForm(true);
  });

  cancelAddPostageButton?.addEventListener("click", () => {
    toggleAddForm(false);
  });

  addPostageButton?.addEventListener("click", () => {
    addPostage().catch((err) => setStatus(`Error: ${String(err)}`, true));
  });
}
