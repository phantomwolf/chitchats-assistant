import { initManufacturers } from "./manufacturer.js";
import { initProducts } from "./product.js";
import { bindStatusElement, setStatus } from "./status.js";

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
  initProducts(setStatus);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      if (tabId) setActiveTab(tabId);
    });
  });
});
