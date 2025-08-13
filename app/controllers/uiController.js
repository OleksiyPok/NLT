
export function createUI(state) {
  const UI = {
    elements: {},
    cache() {
      this.elements.digitLengthSelect = document.getElementById("digit-length");
      this.elements.countSelect = document.getElementById("count");
      this.elements.repeatSelect = document.getElementById("repeat");
      this.elements.rateSelect = document.getElementById("rate");
      this.elements.pitchSelect = document.getElementById("pitch");
      this.elements.langSelect = document.getElementById("lang");
      this.elements.voiceSelect = document.getElementById("voice");
      this.elements.seqTypeSelect = document.getElementById("seq-type");
      this.elements.autoNextCheckbox = document.getElementById("auto-next");
      this.elements.shuffleCheckbox = document.getElementById("shuffle");
      this.elements.infiniteCheckbox = document.getElementById("infinite");
      this.elements.useBackgroundCheckbox = document.getElementById("use-background");
      this.elements.hideNumbersCheckbox = document.getElementById("hide-numbers");
      this.elements.hideToolbarCheckbox = document.getElementById("hide-toolbar");
      this.elements.hideOverlayCheckbox = document.getElementById("hide-overlay");
      this.elements.hideVoiceControlsCheckbox = document.getElementById("hide-voice-controls");
      this.elements.developerModeCheckbox = document.getElementById("developer-mode");
      this.elements.startPauseBtn = document.getElementById("start-pause");
      this.elements.developerPanel = document.getElementById("developer-panel");
    },
    safeSetSelectValue(selectElement, value, defaultValue) {
      if (!selectElement) return;
      const optionExists = [...selectElement.options].some(o => o.value === value);
      selectElement.value = optionExists ? value : defaultValue;
    },
    safeSetCheckbox(checkboxElement, checked) {
      if (!checkboxElement) return;
      checkboxElement.checked = Boolean(checked);
    },
    updateStartPauseButton() {},
    updateControlsState() {},
    setHandlers(handlers) {},
    fillRandom() {},
    highlightSelection() {},
    resetRepeatLeft() {},
    applySettingsToUI(settings) {},
    updateUILabels() {},
    handleKeydown(e) {}
  };
  return UI;
}
