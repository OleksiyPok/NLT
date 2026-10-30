// Texts of the page (by the selected interface language) and enabled / disabled controls.

export function createUiLabels(ctx) {
  const { langLoader, elements, view } = ctx;


  function updateUILabels() {
    const uiLang = elements.uiLangSelect?.value || "en";
    const texts = langLoader.getTexts(uiLang);
    if (!texts) return;
    const E = elements;
    const setText = (el, val) => {
      if (el && el.textContent !== val) el.textContent = val;
    };
    setText(E.uiLangLabel, texts.uiLangLabel);
    setText(E.labelLanguageCode, texts.labelLang);
    setText(E.labelVoice, texts.labelVoice);
    setText(E.labelDigitLength, texts.labelDigitLength);
    setText(E.labelCount, texts.labelCount);
    setText(E.labelRepeat, texts.labelRepeat);
    setText(E.labelSpeed, texts.labelSpeed);
    setText(E.labelInterval, texts.labelInterval);
    setText(E.labelRepeatsText, texts.repeatsLeft);
    setText(E.resetSettingsText, texts.defaultSettings);
    setText(E.fillRandomBtn, texts.fillRandom);
    setText(E.resetBtn, texts.reset);
    setText(E.labelFullscreen, texts.labelFullscreen);
    setText(E.labelFullscreenDelayMode, texts.labelFullscreenDelayMode);
    setText(E.labelDelayTime, texts.labelDelayTime);
    setText(E.labelFullscreenDelay, texts.labelFullscreenDelay);
    setText(E.labelThema, texts.labelThema);
    setText(E.labelThemaMode, texts.labelThemaMode);
    setText(E.settingsTitle, texts.settingsTitle);
    [[E.settingsAppBtn, texts.settingsTitle], [E.settingsAppCloseBtn, texts.closeBtn]].forEach(([el, text]) => {
      if (!el || !text) return;
      el.title = text;
      el.setAttribute("aria-label", text);
    });
    if (E.fullscreenSelect) {
      if (E.fullscreenSelect.options[0].textContent !== texts.fullscreenNo) E.fullscreenSelect.options[0].textContent = texts.fullscreenNo;
      if (E.fullscreenSelect.options[1].textContent !== texts.fullscreenYes) E.fullscreenSelect.options[1].textContent = texts.fullscreenYes;
    }
    if (E.fullscreenDelayMode) {
      if (E.fullscreenDelayMode.options[0].textContent !== texts.delayModeNo) {
        E.fullscreenDelayMode.options[0].textContent = texts.delayModeNo;
      }
      if (E.fullscreenDelayMode.options[1].textContent !== texts.delayModeVisual) {
        E.fullscreenDelayMode.options[1].textContent = texts.delayModeVisual;
      }
      if (E.fullscreenDelayMode.options[2].textContent !== texts.delayModeAudio) {
        E.fullscreenDelayMode.options[2].textContent = texts.delayModeAudio;
      }
    }
    if (E.themaModeSelect) {
      if (E.themaModeSelect.options[0].textContent !== texts.themaModeContrast) {
        E.themaModeSelect.options[0].textContent = texts.themaModeContrast;
      }
      if (E.themaModeSelect.options[1].textContent !== texts.themaModeNormal) {
        E.themaModeSelect.options[1].textContent = texts.themaModeNormal;
      }
      if (E.themaModeSelect.options[2].textContent !== texts.themaModeEvening) {
        E.themaModeSelect.options[2].textContent = texts.themaModeEvening;
      }
      if (E.themaModeSelect.options[3].textContent !== texts.themaModeNight) {
        E.themaModeSelect.options[3].textContent = texts.themaModeNight;
      }
    }

    updateStartPauseButton();
    updateControlsState();
    ctx.onLabelsUpdated?.();
  }

  function updateStartPauseButton() {
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    if (!texts) return;
    const labels = {
      ["playing"]: texts.pause,
      ["paused"]: texts.continue,
      ["ready"]: texts.start,
    };
    const btn = elements.startPauseBtn;
    if (btn) {
      const val = labels[view.appState] || texts.start;
      if (btn.textContent !== val) btn.textContent = val;
    }
  }

  function updateControlsState() {
    const s = view.appState;
    const isPlaying = s === "playing";
    const isPaused = s === "paused";
    const isReady = s === "ready";

    const setDisabled = (el, val) => {
      if (el && el.disabled !== val) el.disabled = val;
    };
    const toggleClass = (el, cls, on) => {
      if (el) el.classList.toggle(cls, on);
    };

    setDisabled(elements.digitLengthSelect, !isReady);
    setDisabled(elements.countSelect, !isReady);
    setDisabled(elements.repeatSelect, !isReady);
    toggleClass(elements.labelDigitLength, "disabled", !isReady);
    toggleClass(elements.labelCount, "disabled", !isReady);
    toggleClass(elements.labelRepeat, "disabled", !isReady);

    setDisabled(elements.languageCodeSelect, isPlaying);
    setDisabled(elements.voiceSelect, isPlaying);
    toggleClass(elements.labelLanguageCode, "disabled", isPlaying);
    toggleClass(elements.labelVoice, "disabled", isPlaying);
    setDisabled(elements.fillRandomBtn, !isReady);
    setDisabled(elements.resetBtn, !isPaused);

    const isFullscreen = (elements.fullscreenSelect?.value || "0") === "1";
    const isDelayModeOn = (elements.fullscreenDelayMode?.value || "No delay") !== "No delay";

    setDisabled(elements.fullscreenDelayMode, !isFullscreen);
    toggleClass(elements.labelFullscreenDelayMode, "disabled", !isFullscreen);

    const disableFsDelay = !isFullscreen || !isDelayModeOn;
    setDisabled(elements.fullscreenDelay, disableFsDelay);
    toggleClass(elements.labelFullscreenDelay, "disabled", disableFsDelay);
  }

  return {
    updateUILabels,
    updateStartPauseButton,
    updateControlsState,
  };
}
