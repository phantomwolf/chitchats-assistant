import { initImportExport } from "./options/import-export.js";
import { initManufacturers } from "./options/manufacturer.js";
import { initPackages } from "./options/package.js";
import { initPostages } from "./options/postage.js";
import { initProducts } from "./options/product.js";
import { initGeneralSettings } from "./options/general.js";
import { bindStatusElement } from "./options/status.js";

export {};

let tabs: HTMLButtonElement[] = [];
let panels: HTMLElement[] = [];

function setActiveTab(tabId: string) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabId}`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindStatusElement();
  tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
  panels = Array.from(document.querySelectorAll<HTMLElement>(".tab-panel"));

  initManufacturers();
  initProducts();
  initPackages();
  initPostages();
  initGeneralSettings();
  initImportExport();

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      if (tabId) setActiveTab(tabId);
    });
  });
});
