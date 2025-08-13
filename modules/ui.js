import { Config } from "./config.js";
import { Utils } from "./utils.js";
import { Storage } from "./storage.js";

export function createUI(state) {
  const UI = {
    SELECTORS: {
      uiLangSelect: "#uiLangSelect",
      repeatLeft: "#repeatLeft",
      speedSelect: "#speedSelect",
      delaySelect: "#delaySelect",
      digitLengthSelect: "#digitLengthSelect",
      countSelect: "#countSelect",
      repeatSelect: "#repeatSelect",
      fullscreenSelect: "#fullscreenSelect",
      languageCodeSelect: ".language-code-select",
      labelLanguageCode: ".label-language-code",
      voiceSelect: "#voiceSelect",
      numberGrid: "#numberGrid",
      labelRepeatsText: "#labelRepeatsText",
      fillRandomBtn: "#fillRandomBtn",
      resetSettingsBtn: "#resetSettingsBtn",
      startPauseBtn: "#startPauseBtn",
      resetBtn: "#resetBtn",
      uiLangLabel: "#uiLangLabel",
      labelVoice: "#labelVoice",
      labelDigitLength: "#labelDigitLength",
      labelCount: "#labelCount",
      labelRepeat: "#labelRepeat",
      labelSpeed: "#labelSpeed",
      labelDelay: "#labelDelay",
      labelFullscreen: "#labelFullscreen",
      developerPanel: "#developer",
      backgroundOverlay: "#backgroundOverlay",
      activeNumberOverlay: "#activeNumberOverlay",
    },
    elements: {},
    handlersAttached: false,
    cache() {
      const sel = this.SELECTORS;
      for (const key in sel) {
        this.elements[key] = document.querySelector(sel[key]) || null;
      }
    },
    safeSetSelectValue(selectElem, value, fallback) {
      if (!selectElem) return fallback;
      const opts = Array.from(selectElem.options || []).map((o) => o.value);
      const chosen = opts.includes(value) ? value : fallback;
      if (selectElem.value !== chosen) selectElem.value = chosen;
      return chosen;
    },
    populateLanguageSelect() {
      const el = this.elements.languageCodeSelect;
      if (!el) return;
      const frag = document.createDocumentFragment();
      state.availableLanguages.forEach((lang) => {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang;
        frag.appendChild(opt);
      });
      el.replaceChildren(frag);
      const configLang = (
        (state.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL"
      ).toUpperCase();
      el.value = state.availableLanguages.includes(configLang)
        ? configLang
        : Utils.isMobileDevice()
        ? "ALL"
        : el.value;
    },
    populateVoiceSelect() {
      const el = this.elements.voiceSelect;
      if (!el || !state.voices.length) return;
      const isMobile = Utils.isMobileDevice();
      const selectedLang = (
        this.elements.languageCodeSelect?.value || "ALL"
      ).toUpperCase();
      const voicesToShow =
        isMobile || selectedLang === "ALL"
          ? state.voices
          : state.voices.filter((v) =>
              (v.lang || "").toUpperCase().startsWith(selectedLang)
            );
      const frag = document.createDocumentFragment();
      voicesToShow.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang || ""})`;
        frag.appendChild(opt);
      });
      el.replaceChildren(frag);
      const requestedVoice = Utils.normalizeString(
        state.settings.voiceName || ""
      );
      const requestedLang = Utils.normalizeString(
        state.settings.languageCode || ""
      );
      let match = null;
      match = isMobile
        ? voicesToShow.find(
            (v) => Utils.normalizeString(v.lang) === requestedLang
          )
        : voicesToShow.find(
            (v) => Utils.normalizeString(v.name) === requestedVoice
          );
      if (!match && voicesToShow.length) match = voicesToShow[0];
      if (match && el.value !== match.name) el.value = match.name;
      state.settings.voiceName = el.value;
    },
    updateUILabels() {
      const texts = state.texts[this.elements.uiLangSelect?.value];
      if (!texts) return;
      const E = this.elements;
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
      setText(E.labelDelay, texts.labelDelay);
      setText(E.labelRepeatsText, texts.repeatsLeft);
      setText(E.fillRandomBtn, texts.fillRandom);
      setText(E.resetBtn, texts.reset);
      setText(E.labelFullscreen, texts.labelFullscreen);
      if (E.fullscreenSelect) {
        if (E.fullscreenSelect.options[0].textContent !== texts.fullscreenNo)
          E.fullscreenSelect.options[0].textContent = texts.fullscreenNo;
        if (E.fullscreenSelect.options[1].textContent !== texts.fullscreenYes)
          E.fullscreenSelect.options[1].textContent = texts.fullscreenYes;
      }
      this.updateStartPauseButton();
      this.updateControlsState();
    },
    updateStartPauseButton() {
      const texts = state.texts[this.elements.uiLangSelect?.value];
      if (!texts) return;
      const labels = {
        [Config.CONFIG.ENUMS.AppStates.PLAYING]: texts.pause,
        [Config.CONFIG.ENUMS.AppStates.PAUSED]: texts.continue,
        [Config.CONFIG.ENUMS.AppStates.READY]: texts.start,
      };
      const btn = this.elements.startPauseBtn;
      if (btn) {
        const val = labels[state.appState] || texts.start;
        if (btn.textContent !== val) btn.textContent = val;
      }
    },
    updateControlsState() {
      const disable = state.appState === Config.CONFIG.ENUMS.AppStates.PLAYING;
      const isInitialState =
        state.appState === Config.CONFIG.ENUMS.AppStates.READY &&
        state.currentIndex === 0 &&
        Number(this.elements.repeatLeft?.textContent || 0) ===
          Number(this.elements.repeatSelect?.value || 0);
      const disableCountRepeat = !isInitialState;
      const disableDigitLength = !isInitialState;
      const setDisabled = (el, val) => {
        if (el && el.disabled !== val) el.disabled = val;
      };
      const toggleClass = (el, cls, on) => {
        if (el) el.classList.toggle(cls, on);
      };
      setDisabled(this.elements.languageCodeSelect, disable);
      setDisabled(this.elements.voiceSelect, disable);
      toggleClass(this.elements.labelLanguageCode, "disabled", disable);
      toggleClass(this.elements.labelVoice, "disabled", disable);
      setDisabled(this.elements.fillRandomBtn, !isInitialState);
      setDisabled(this.elements.countSelect, disableCountRepeat);
      setDisabled(this.elements.repeatSelect, disableCountRepeat);
      toggleClass(this.elements.labelCount, "disabled", disableCountRepeat);
      toggleClass(this.elements.labelRepeat, "disabled", disableCountRepeat);
      setDisabled(this.elements.digitLengthSelect, disableDigitLength);
      toggleClass(
        this.elements.labelDigitLength,
        "disabled",
        disableDigitLength
      );
      setDisabled(
        this.elements.resetBtn,
        !(
          state.appState === Config.CONFIG.ENUMS.AppStates.PAUSED &&
          !isInitialState
        )
      );
    },
    showBackgroundOverlay() {
      if ((this.elements.fullscreenSelect?.value || "0") !== "1") return;
      const overlay = this.elements.backgroundOverlay;
      if (!overlay) return;
      overlay.classList.add("show");
    },
    hideBackgroundOverlay() {
      const overlay = this.elements.backgroundOverlay;
      if (!overlay) return;
      this.elements.backgroundOverlay.classList.remove("show");
    },
    showActiveNumberOverlay(value, delayMs) {
      if ((this.elements.fullscreenSelect?.value || "0") !== "1") return;
      const overlay = this.elements.activeNumberOverlay;
      if (!overlay) return;
      if (overlay.textContent !== value) overlay.textContent = value || "";
      overlay.classList.add("show");
      setTimeout(() => {
        overlay.classList.remove("show");
      }, 500 + Number(delayMs || 0));
    },
    hideActiveNumberOverlay() {
      const overlay = this.elements.activeNumberOverlay;
      if (!overlay) return;
      this.elements.activeNumberOverlay.classList.remove("show");
    },
    cacheInputs() {
      this.elements.numberGrid &&
        (state.inputs = Array.from(
          this.elements.numberGrid.querySelectorAll("input[type='text']")
        ));
    },
    fillRandom() {
      const maxValue =
        10 ** Utils.safeNumber(state.settings.digitLength, 2) - 1;
      state.inputs.forEach((input) => {
        input.value = String(Math.floor(Math.random() * (maxValue + 1)));
      });
    },
    highlightSelection() {
      const count = Number(state.settings.count || 0);
      const ci = state.currentIndex;
      state.inputs.forEach((input, idx) => {
        const sel = idx < count;
        const hi = idx === ci;
        if (input.classList.contains("selected") !== sel)
          input.classList.toggle("selected", sel);
        if (input.classList.contains("highlight") !== hi)
          input.classList.toggle("highlight", hi);
      });
      const activeInput = state.inputs[ci];
      const overlay = this.elements.activeNumberOverlay;
      if (overlay && overlay.textContent !== (activeInput?.value || "")) {
        overlay.textContent = activeInput?.value || "";
      }
    },
    resetRepeatLeft() {
      if (this.elements.repeatLeft && this.elements.repeatSelect) {
        const val = this.elements.repeatSelect.value;
        if (this.elements.repeatLeft.textContent !== val)
          this.elements.repeatLeft.textContent = val;
      }
      this.updateControlsState();
    },
    updateSettingsFromUI() {
      const E = this.elements;
      const s = state.settings;
      const upd = (key, el, fallback) => {
        if (el) s[key] = el.value || fallback;
      };
      upd("digitLength", E.digitLengthSelect, s.digitLength);
      upd("count", E.countSelect, s.count);
      upd("repeat", E.repeatSelect, s.repeat);
      upd("uiLang", E.uiLangSelect, s.uiLang);
      upd("languageCode", E.languageCodeSelect, s.languageCode);
      upd("voiceName", E.voiceSelect, s.voiceName);
      upd("speed", E.speedSelect, s.speed);
      upd("delay", E.delaySelect, s.delay);
      upd("fullscreen", E.fullscreenSelect, s.fullscreen);
      Storage.save(s);
    },
    attachEventHandlers(Handlers) {
      if (this.handlersAttached) return;
      this.handlersAttached = true;
      const E = this.elements;
      E.uiLangSelect?.addEventListener("change", () => {
        this.updateUILabels();
        this.updateSettingsFromUI();
      });
      if (!Utils.isMobileDevice())
        E.languageCodeSelect?.addEventListener("change", () => {
          this.populateVoiceSelect();
          this.updateSettingsFromUI();
        });
      E.voiceSelect?.addEventListener("change", () =>
        this.updateSettingsFromUI()
      );
      E.digitLengthSelect?.addEventListener("change", () => {
        this.updateSettingsFromUI();
        Handlers.onDigitLengthChange();
      });
      E.countSelect?.addEventListener("change", () => {
        this.updateSettingsFromUI();
        Handlers.onCountChange();
      });
      E.repeatSelect?.addEventListener("change", () => {
        this.updateSettingsFromUI();
        Handlers.onRepeatChange();
      });
      E.speedSelect?.addEventListener("change", () =>
        this.updateSettingsFromUI()
      );
      E.delaySelect?.addEventListener("change", () =>
        this.updateSettingsFromUI()
      );
      E.fillRandomBtn?.addEventListener("click", () => {
        Handlers.onFillRandomClick();
      });
      E.fullscreenSelect?.addEventListener("change", () =>
        this.updateSettingsFromUI()
      );
      E.resetSettingsBtn?.addEventListener("click", () =>
        Handlers.onResetSettingsClick()
      );
      E.startPauseBtn?.addEventListener("click", () => {
        window.userActivated = true; /// TODO
        Handlers.onStartPauseClick();
      });
      E.resetBtn?.addEventListener(
        "click",
        () => Handlers.onResetClick && Handlers.onResetClick()
      );
    },
  };

  
  return UI;
}
