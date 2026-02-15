let statusEl: HTMLDivElement | null = null;

export function bindStatusElement() {
  statusEl = document.getElementById("status") as HTMLDivElement | null;
}

export function setStatus(message: string, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.add("visible");
  statusEl.style.background = isError ? "#fef2f2" : "#ecfdf3";
  statusEl.style.color = isError ? "#991b1b" : "#166534";
  statusEl.style.borderColor = isError ? "#fecaca" : "#bbf7d0";
}
