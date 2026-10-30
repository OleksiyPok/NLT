// The number fields, the repeat counter and the overlays of the fullscreen mode.

export function createUiNumbers({ utils, elements, view }, labels) {


  function cacheInputs() {
    view.inputs = elements.numberGrid ? Array.from(elements.numberGrid.querySelectorAll("input[type='text']")) : [];
  }
  const getInputs = () => view.inputs.slice();
  const getSelectedInputs = () => view.inputs.filter((i) => i.classList.contains("selected"));

  function showBackgroundOverlay() {
    if ((elements.fullscreenSelect?.value || "0") !== "1") return;
    elements.backgroundOverlay?.classList.add("show");
  }

  function hideBackgroundOverlay() {
    elements.backgroundOverlay?.classList.remove("show");
  }

  function showActiveNumberOverlay(value, delayMs) {
    if ((elements.fullscreenSelect?.value || "0") !== "1") return;
    const overlay = elements.activeNumberOverlay;
    if (!overlay) return;
    if (overlay.textContent !== value) overlay.textContent = value || "";
    overlay.classList.add("show");
  }

  function hideActiveNumberOverlay() {
    elements.activeNumberOverlay?.classList.remove("show");
  }

  function resetRepeatLeft() {
    if (elements.repeatLeft && elements.repeatSelect) {
      const val = elements.repeatSelect.value;
      if (elements.repeatLeft.textContent !== val) elements.repeatLeft.textContent = val;
    }
    labels.updateControlsState();
  }

  function fillRandom() {
    const maxValue = 10 ** utils.safeNumber(view.settings.digitLength, 2) - 1;
    getInputs().forEach((input) => {
      input.value = String(Math.floor(Math.random() * (maxValue + 1)));
    });
  }

  function highlightSelection() {
    const count = Number(view.settings.count || 0);
    const ci = view.index || 0;
    getInputs().forEach((input, idx) => {
      const sel = idx < count;
      const hi = idx === ci;
      if (input.classList.contains("selected") !== sel) input.classList.toggle("selected", sel);
      if (input.classList.contains("highlight") !== hi) input.classList.toggle("highlight", hi);
    });
  }

  return {
    cacheInputs,
    getInputs,
    getSelectedInputs,
    showBackgroundOverlay,
    hideBackgroundOverlay,
    showActiveNumberOverlay,
    hideActiveNumberOverlay,
    resetRepeatLeft,
    fillRandom,
    highlightSelection,
  };
}
