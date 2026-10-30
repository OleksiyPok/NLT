"use strict";

import { APP_VERSION, STORAGE_KEY, createConfig } from "./core/config.js";
import { createEventBus } from "./core/event-bus.js";
import { EventTypes } from "./core/event-types.js";
import { createLangLoader } from "./core/i18n.js";
import { createStore } from "./core/store.js";
import { Utils } from "./core/utils.js";
import { createPlayback } from "./features/playback.js";
import { createSpeaker } from "./features/speaker.js";
import { createVoices } from "./features/voices.js";
import { createWakeLock } from "./features/wake-lock.js";

function createUI({ bus, utils, config, langLoader }) {
  const themeRegistry = window.NLTThemeRegistry || null;
  const themeValues = Array.isArray(themeRegistry?.themeValues) ? themeRegistry.themeValues : [];
  const themeFallback = typeof themeRegistry?.defaultTheme === "string" ? themeRegistry.defaultTheme : "theme-yellowblue-normal";
  const fbParsed = typeof themeRegistry?.parseThema === "function" ? themeRegistry.parseThema(themeFallback) : null;
  const themeDefaultPalette = fbParsed?.palette || "yellowblue";
  const themeDefaultMode = fbParsed?.mode || "normal";

  const SELECTORS = {
    helpAppBtn: "#helpAppBtn",
    helpAppModal: "#helpAppModal",
    helpAppCloseBtn: "#helpAppCloseBtn",
    helpAppContent: "#helpAppContent",
    uiLangSelect: "#uiLangSelect",
    repeatLeft: "#repeatLeft",
    speedSelect: "#speedSelect",
    intervalSelect: "#intervalSelect",
    digitLengthSelect: "#digitLengthSelect",
    countSelect: "#countSelect",
    repeatSelect: "#repeatSelect",
    fullscreenSelect: "#fullscreenSelect",
    languageCodeSelect: "#languageCodeSelect",
    labelLanguageCode: "#labelLanguageCode",
    voiceSelect: "#voiceSelect",
    numberGrid: "#numberGrid",
    labelRepeatsText: "#labelRepeatsText",
    fillRandomBtn: "#fillRandomBtn",
    resetSettingsBtn: "#resetSettingsBtn",
    resetSettingsText: "#resetSettingsText",
    startPauseBtn: "#startPauseBtn",
    resetBtn: "#resetBtn",
    uiLangLabel: "#uiLangLabel",
    labelVoice: "#labelVoice",
    labelDigitLength: "#labelDigitLength",
    labelCount: "#labelCount",
    labelRepeat: "#labelRepeat",
    labelSpeed: "#labelSpeed",
    labelInterval: "#labelInterval",
    labelFullscreen: "#labelFullscreen",
    labelFullscreenDelayMode: "#labelFullscreenDelayMode",
    labelFullscreenDelay: "#labelFullscreenDelay",
    labelFullscreenDelayMode: "#labelFullscreenDelayMode",
    labelDelayTime: "#labelDelayTime",
    fullscreenDelayMode: "#fullscreenDelayMode",
    fullscreenDelay: "#fullscreenDelay",
    themaModeSelect: "#themaModeSelect",
      themaSelect: "#themaSelect",
      labelThema: "#labelThema",
      labelThemaMode: "#labelThemaMode",
    developerPanel: "#developer",
    backgroundOverlay: "#backgroundOverlay",
    activeNumberOverlay: "#activeNumberOverlay",
  };

  const elements = {};
  let inputsCache = [];
  let voicesList = [];
  let availableLanguages = [];
  let currentSettings = { pitch: 1.0, volume: 1.0 };
  let currentAppState = "init";
  let currentIndex = 0;

  function cache() {
    for (const key in SELECTORS) elements[key] = document.querySelector(SELECTORS[key]) || null;
    renderThemeSelectOptions();
  }
  function renderThemeSelectOptions() {
    const select = elements.themaSelect;
    if (!select) return;
    const palettes = typeof themeRegistry?.getPaletteOptions === "function" ? themeRegistry.getPaletteOptions() : [];
    if (!palettes.length) return;

    select.innerHTML = "";
    for (const row of palettes) {
      const option = document.createElement("option");
      option.value = row.palette;
      option.textContent = String(row.label || row.palette);
      select.appendChild(option);
    }
  }

  function resolveCanonicalThema(raw) {
    const rawStr =
      typeof themeRegistry?.resolveThemaKey === "function"
        ? themeRegistry.resolveThemaKey(String(raw || ""))
        : String(raw || "");
    if (themeValues.includes(rawStr)) return rawStr;
    const parsed = typeof themeRegistry?.parseThema === "function" ? themeRegistry.parseThema(rawStr) : null;
    if (parsed && typeof themeRegistry?.composeThema === "function") {
      const composed = themeRegistry.composeThema(parsed.palette, parsed.mode);
      if (composed) return composed;
    }
    return themeFallback;
  }

  function syncThemeSelectorsFromThema(canonicalFullThema) {
    const parsed = typeof themeRegistry?.parseThema === "function" ? themeRegistry.parseThema(canonicalFullThema) : null;
    if (!parsed) return;
    if (elements.themaSelect) {
      utils.safeSetSelectValue(elements.themaSelect, parsed.palette, themeDefaultPalette);
    }
    if (elements.themaModeSelect) {
      utils.safeSetSelectValue(elements.themaModeSelect, parsed.mode, themeDefaultMode);
    }
  }
  function cacheInputs() {
    inputsCache = elements.numberGrid ? Array.from(elements.numberGrid.querySelectorAll("input[type='text']")) : [];
  }
  const getInputs = () => inputsCache.slice();
  const getSelectedInputs = () => inputsCache.filter((i) => i.classList.contains("selected"));

  function setSelectsFromSettings(s) {
    const E = elements;
    s.digitLength = utils.safeNumber(utils.safeSetSelectValue(E.digitLengthSelect, String(s.digitLength), "2"), 2);
    s.count = utils.safeNumber(utils.safeSetSelectValue(E.countSelect, String(s.count), "40"), 40);
    s.repeat = utils.safeNumber(utils.safeSetSelectValue(E.repeatSelect, String(s.repeat), "1"), 1);
    s.speed = utils.safeNumber(utils.safeSetSelectValue(E.speedSelect, Number(s.speed).toFixed(1), "1.0"), 1.0);
    s.intervalMs = utils.safeNumber(utils.safeSetSelectValue(E.intervalSelect, String(s.intervalMs), "1000"), 1000);
    s.fullscreen = utils.safeSetSelectValue(E.fullscreenSelect, String(s.fullscreen), "0");
    s.fullscreenDelayMode = utils.safeSetSelectValue(elements.fullscreenDelayMode, s.fullscreenDelayMode, "No delay");
    s.fullscreenDelay = utils.safeSetSelectValue(elements.fullscreenDelay, String(s.fullscreenDelay), "2");

    s.thema = resolveCanonicalThema(s.thema);
    syncThemeSelectorsFromThema(s.thema);

    if (s.uiLang && E.uiLangSelect) E.uiLangSelect.value = s.uiLang;
    if (E.languageCodeSelect) {
      const langPart = (s.languageCode || "ALL").split(/[-_]/)[0].toUpperCase();
      E.languageCodeSelect.value = langPart;
    }
  }

  function applyThemeFromSettings(settings) {
    const html = document.documentElement;
    if (!html) return;

    const wanted = String(settings?.thema || "");
    const chosen =
      typeof themeRegistry?.applyThemeClass === "function"
        ? themeRegistry.applyThemeClass(html, wanted, themeFallback)
        : themeValues.includes(wanted)
          ? wanted
          : themeFallback;

    syncThemeSelectorsFromThema(chosen);
  }

  function isAppHelpModalOpen() {
    return !elements.helpAppModal?.classList.contains("hidden");
  }

  function loadHelpContent() {
    const el = elements.helpAppContent;
    if (!el) return;

    const currentLang = elements.uiLangSelect?.value || "en";
    loadHelpContentLang(currentLang);
  }

  function loadHelpContentLang(lang) {
    const el = elements.helpAppContent;
    if (!el) return;

    const load = (code) =>
      fetch(`docs/help/help.${code}.html`).then((r) => {
        if (!r.ok) throw new Error(`Help file not found: ${code}`);
        return r.text();
      });

    load(lang)
      .then((html) => {
        el.innerHTML = html;
        el.dataset.loaded = "1";
      })
      .catch((e) => {
        console.warn(`Help lang load failed (${lang}), fallback to EN`, e);

        if (lang === "en") return;

        load("en")
          .then((html) => {
            el.innerHTML = html;
            el.dataset.loaded = "1";
          })
          .catch((err) => console.warn("Help fallback EN failed", err));
      });
  }

  function openHelpModal() {
    elements.helpAppModal?.classList.remove("hidden");
  }

  function closeHelpModal() {
    elements.helpAppModal?.classList.add("hidden");

    if (elements.helpAppContent) {
      elements.helpAppContent.innerHTML = "";
      elements.helpAppContent.dataset.loaded = "0";
    }
  }

  function populateLanguageSelect() {
    const el = elements.languageCodeSelect;
    if (!el) return;
    const frag = document.createDocumentFragment();
    availableLanguages.forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      frag.appendChild(opt);
    });
    el.replaceChildren(frag);
    const configLang = ((currentSettings.languageCode || "ALL").split(/[-_]/)[0] || "ALL").toUpperCase();
    el.value = availableLanguages.includes(configLang) ? configLang : utils.isMobileDevice() ? "ALL" : el.value;
  }

  function populateVoiceSelect() {
    const el = elements.voiceSelect;
    if (!el) return;
    const isMobile = utils.isMobileDevice();
    const selectedLang = (elements.languageCodeSelect?.value || "ALL").toUpperCase();

    if (!voicesList || !voicesList.length) {
      el.replaceChildren();
      return;
    }

    const voicesToShow = isMobile || selectedLang === "ALL" ? voicesList : voicesList.filter((v) => (v.lang || "").toUpperCase().startsWith(selectedLang));

    const frag = document.createDocumentFragment();
    voicesToShow.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang || ""})`;
      frag.appendChild(opt);
    });
    el.replaceChildren(frag);

    let match = voicesToShow.find((v) => utils.normalizeString(v.name) === utils.normalizeString(currentSettings.voiceName));
    if (!match && voicesToShow.length) match = voicesToShow[0];

    if (match && el.value !== match.name) {
      el.value = match.name;
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
    }
  }

  function setLanguageCodeFromSettings() {
    const E = elements;
    const langPart = ((currentSettings.languageCode || "ALL").split(/[-_]/)[0] || "ALL").toUpperCase();
    if (E.languageCodeSelect && E.languageCodeSelect.value !== langPart) {
      E.languageCodeSelect.value = langPart;
    }
  }
  function setVoiceFromSettings() {
    const E = elements;
    const voice = currentSettings.voiceName;
    if (!E.voiceSelect || !voice) return;
    const opts = Array.from(E.voiceSelect.options).map((o) => o.value);
    if (opts.includes(voice) && E.voiceSelect.value !== voice) {
      E.voiceSelect.value = voice;
    }
  }

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
      const val = labels[currentAppState] || texts.start;
      if (btn.textContent !== val) btn.textContent = val;
    }
  }

  function updateControlsState() {
    const s = currentAppState;
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

  function updateSettingsFromUI() {
    const E = elements;
    const s = {};
    const upd = (key, el, fallback) => {
      if (el) s[key] = el.value || fallback;
    };
    upd("digitLength", E.digitLengthSelect, currentSettings.digitLength);
    upd("count", E.countSelect, currentSettings.count);
    upd("repeat", E.repeatSelect, currentSettings.repeat);
    upd("uiLang", E.uiLangSelect, currentSettings.uiLang);
    upd("languageCode", E.languageCodeSelect, currentSettings.languageCode);
    upd("voiceName", E.voiceSelect, currentSettings.voiceName);
    upd("speed", E.speedSelect, currentSettings.speed);
    upd("intervalMs", E.intervalSelect, currentSettings.intervalMs);
    upd("fullscreen", E.fullscreenSelect, currentSettings.fullscreen);
    upd("fullscreenDelayMode", E.fullscreenDelayMode, currentSettings.fullscreenDelayMode);
    upd("fullscreenDelay", E.fullscreenDelay, currentSettings.fullscreenDelay);
    const palette = E.themaSelect?.value;
    const mode = E.themaModeSelect?.value;
    const composed =
      palette && mode && typeof themeRegistry?.composeThema === "function" ? themeRegistry.composeThema(palette, mode) : null;
    s.thema = composed || currentSettings.thema;
    bus.emit(EventTypes.SETTINGS_UPDATE, s);
  }

  function attachEventHandlers() {
    const E = elements;

    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      updateSettingsFromUI();

      if (isAppHelpModalOpen()) {
        loadHelpContent();
      }
    });

    if (!utils.isMobileDevice()) {
      E.languageCodeSelect?.addEventListener("change", () => {
        const selectedLang = E.languageCodeSelect.value;
        let newSettings = { languageCode: selectedLang };
        populateVoiceSelect();
        const selectedVoice = E.voiceSelect?.value || null;
        if (selectedVoice) newSettings.voiceName = selectedVoice;
        bus.emit(EventTypes.SETTINGS_UPDATE, newSettings);
        setVoiceFromSettings();
      });
    }

    E.voiceSelect?.addEventListener("change", () => updateSettingsFromUI());

    E.digitLengthSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      fillRandom();
      highlightSelection();
    });

    E.countSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      highlightSelection();
    });

    E.repeatSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      resetRepeatLeft();
    });

    E.speedSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.intervalSelect?.addEventListener("change", () => updateSettingsFromUI());

    E.fillRandomBtn?.addEventListener("click", () => {
      fillRandom();
      highlightSelection();
    });

    E.fullscreenSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.fullscreenDelayMode?.addEventListener("change", () => updateSettingsFromUI());
    E.fullscreenDelay?.addEventListener("change", () => updateSettingsFromUI());
    E.themaSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.themaModeSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.resetSettingsBtn?.addEventListener("click", () => bus.emit(EventTypes.APP_SETTINGS_RESET));
    E.startPauseBtn?.addEventListener("click", () => bus.emit(EventTypes.PLAYBACK_TOGGLE));
    E.resetBtn?.addEventListener("click", () => bus.emit(EventTypes.APP_FULL_RESET));
    E.helpAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_OPEN));
    E.helpAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_CLOSE));
    E.helpAppModal?.addEventListener("click", (e) => {
      if (e.target === elements.helpAppModal) {
        bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
      }
    });
  }

  function resetRepeatLeft() {
    if (elements.repeatLeft && elements.repeatSelect) {
      const val = elements.repeatSelect.value;
      if (elements.repeatLeft.textContent !== val) elements.repeatLeft.textContent = val;
    }
    updateControlsState();
  }

  function fillRandom() {
    const maxValue = 10 ** utils.safeNumber(currentSettings.digitLength, 2) - 1;
    getInputs().forEach((input) => {
      input.value = String(Math.floor(Math.random() * (maxValue + 1)));
    });
  }

  function highlightSelection() {
    const count = Number(currentSettings.count || 0);
    const ci = currentIndex || 0;
    getInputs().forEach((input, idx) => {
      const sel = idx < count;
      const hi = idx === ci;
      if (input.classList.contains("selected") !== sel) input.classList.toggle("selected", sel);
      if (input.classList.contains("highlight") !== hi) input.classList.toggle("highlight", hi);
    });
  }

  function bindEventSubscriptions() {
    bus.on(EventTypes.UI_HELP_MODAL_OPEN, () => {
      loadHelpContent();
      openHelpModal();
    });
    bus.on(EventTypes.UI_HELP_MODAL_CLOSE, closeHelpModal);
    bus.on(EventTypes.UI_BACKGROUND_SHOW, showBackgroundOverlay);
    bus.on(EventTypes.UI_BACKGROUND_HIDE, hideBackgroundOverlay);
    bus.on(EventTypes.UI_ACTIVE_NUMBER_SHOW, ({ value, delayMs }) => showActiveNumberOverlay(value, delayMs));
    bus.on(EventTypes.UI_ACTIVE_NUMBER_HIDE, hideActiveNumberOverlay);
    bus.on(EventTypes.UI_HIGHLIGHT, highlightSelection);
    bus.on(EventTypes.UI_REPEAT_LEFT_SET, (val) => {
      if (elements.repeatLeft && String(elements.repeatLeft.textContent) !== String(val)) {
        elements.repeatLeft.textContent = String(val);
      }
      updateControlsState();
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      currentAppState = s;
      updateStartPauseButton();
      updateControlsState();
    });
    bus.on(EventTypes.UI_TEXTS_UPDATE, updateUILabels);

    bus.on(EventTypes.VOICES_CHANGED, ({ voices, availableLanguages: langs }) => {
      voicesList = (voices || []).map((v) => ({
        name: v.name,
        lang: v.lang,
      }));
      availableLanguages = (langs || []).slice();
      if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
      populateLanguageSelect();
      populateVoiceSelect();
    });

    bus.on(EventTypes.VOICES_LOADED, ({ voices, availableLanguages: langs }) => {
      voicesList = (voices || []).map((v) => ({
        name: v.name,
        lang: v.lang,
      }));
      availableLanguages = (langs || []).slice();
      if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
      populateLanguageSelect();
      populateVoiceSelect();
    });

    bus.on(EventTypes.SETTINGS_CHANGED, (newSettings) => {
      setSelectsFromSettings(newSettings);
      currentSettings = { ...newSettings };
      applyThemeFromSettings(newSettings);
      setLanguageCodeFromSettings();
      setVoiceFromSettings();
      updateUILabels();
      highlightSelection();
    });

    bus.on(EventTypes.PLAYBACK_INDEX, (idx) => {
      currentIndex = idx;
      highlightSelection();
    });
  }

  return {
    cache,
    cacheInputs,
    getInputs,
    getSelectedInputs,
    setSelectsFromSettings,
    populateLanguageSelect,
    populateVoiceSelect,
    setLanguageCodeFromSettings,
    setVoiceFromSettings,
    updateUILabels,
    updateStartPauseButton,
    updateControlsState,
    showBackgroundOverlay,
    hideBackgroundOverlay,
    showActiveNumberOverlay,
    hideActiveNumberOverlay,
    updateSettingsFromUI,
    attachEventHandlers,
    bindEventSubscriptions,
    resetRepeatLeft,
    fillRandom,
    highlightSelection,
    isAppHelpModalOpen,
    elements,
  };
}

function createApp({ bus, config, langLoader, store, ui, voices, speaker, wakeLock, utils }) {
  function setAppStateDirect(s) {
    store.setAppState(s);
    if (s === "playing") wakeLock.request();
    else wakeLock.release();
  }

  async function resetToDefaultSettings() {
    speaker.cancel();
    bus.emit(EventTypes.PLAYBACK_STOP);

    store.resetSettings(config.getDefaults());
    ui.fillRandom();
    ui.highlightSelection();
    ui.resetRepeatLeft();

    const settings = store.getSettings();
    const defaultVoiceName = settings.voiceName;
    const defaultLangCode = (settings.languageCode || "").replace("_", "-").toLowerCase();

    const voices = Voices.getVoices();
    const match = voices.find((v) => {
      const voiceLang = (v.lang || "").replace("_", "-").toLowerCase();
      return utils.normalizeString(v.name) === utils.normalizeString(defaultVoiceName) || voiceLang === defaultLangCode;
    });

    if (match) {
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
    } else if (voices.length) {
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: voices[0].name });
    }
  }

  function fullReset() {
    speaker.cancel();
    bus.emit(EventTypes.PLAYBACK_STOP);
  }

  function handleKeyControls(event) {
    const tag = document.activeElement?.tagName || "";
    const isTyping = ["INPUT", "TEXTAREA"].includes(tag);

    if (event.key === "F1" || event.code === "F1" || event.keyCode === 112) {
      event.preventDefault();
      bus.emit(EventTypes.UI_HELP_MODAL_OPEN);
      return;
    }

    if (event.key === "Escape" || event.code === "Escape" || event.keyCode === 27) {
      event.preventDefault();

      if (ui.isAppHelpModalOpen()) {
        bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
        return;
      }

      bus.emit(EventTypes.APP_FULL_RESET);
    }

    if ((event.key === " " || event.code === "Space" || event.keyCode === 32) && !isTyping) {
      event.preventDefault();
      bus.emit(EventTypes.PLAYBACK_TOGGLE);
    }
  }

  async function handleDOMContentLoaded() {
    ui.bindEventSubscriptions();
    ui.cache();

    await config.load();

    const stored = store.loadSettings() || {};
    const defaults = config.getDefaults();

    const mergedSettings = Utils.deepMerge(defaults, stored);
    store.resetSettings(mergedSettings);

    await langLoader.loadAll();

    const uiLang = mergedSettings.uiLang || "en";
    if (ui.elements.uiLangSelect) {
      ui.elements.uiLangSelect.value = uiLang;
      bus.emit(EventTypes.SETTINGS_UPDATE, { uiLang });
    }
    bus.emit(EventTypes.UI_TEXTS_UPDATE);

    if (utils.isMobileDevice()) {
      [ui.elements.languageCodeSelect, ui.elements.labelLanguageCode].forEach((el) => el && (el.style.display = "none"));
    }

    ui.cacheInputs();
    ui.fillRandom();
    ui.highlightSelection();
    ui.attachEventHandlers();

    ui.elements.resetBtn?.addEventListener("click", () => bus.emit(EventTypes.APP_FULL_RESET));
    if (ui.elements.startPauseBtn) ui.elements.startPauseBtn.disabled = false;
    ui.resetRepeatLeft();
    document.addEventListener("keydown", handleKeyControls);

    document.getElementById("version").textContent = `version ${APP_VERSION}`;

    // Removes only the settings of this app, other localStorage keys stay
    document.getElementById("developerPathBtn")?.addEventListener("click", () => alert(location.href));
    document.getElementById("developerClearBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      alert(`${STORAGE_KEY} cleared`);
    });

    if (ui.elements.developerPanel) {
      ui.elements.developerPanel.style.display = mergedSettings.developerMode ? "flex" : "none";
    }

    speaker.init(
      () => voices.getVoices(),
      () => store.getSettings()
    );
    wakeLock.init();

    bus.on(EventTypes.VOICES_LOADED, () => {
      ui.populateLanguageSelect();
      ui.setLanguageCodeFromSettings();
      ui.populateVoiceSelect();
      ui.setVoiceFromSettings();

      const settings = store.getSettings();
      const allVoices = voices.getVoices() || [];

      if (!settings.voiceName) {
        if (allVoices.length) {
          bus.emit(EventTypes.SETTINGS_UPDATE, {
            voiceName: allVoices[0].name,
          });
        }
        return;
      }

      let match = allVoices.find((v) => Utils.normalizeString(v.name) === Utils.normalizeString(settings.voiceName));
      if (!match) {
        match = allVoices.find((v) => Utils.normalizeString(v.name).includes(Utils.normalizeString(settings.voiceName)));
      }
      if (!match && settings.languageCode) {
        const wanted = (settings.languageCode || "").toLowerCase();
        match = allVoices.find((v) => (v.lang || "").toLowerCase() === wanted);
        if (!match) {
          match = allVoices.find((v) => (v.lang || "").toLowerCase().startsWith(wanted.split(/[-_]/)[0]));
        }
      }
      if (match) {
        if (match.name !== settings.voiceName) {
          bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
        }
      } else if (allVoices.length) {
        bus.emit(EventTypes.SETTINGS_UPDATE, {
          voiceName: allVoices[0].name,
        });
      }
    });

    await voices.load();

    try {
      await speaker.warmUp();
    } catch (e) {
      console.warn("Speech warm-up failed", e);
    }

    const currentSettings = store.getSettings();
    bus.emit(EventTypes.SETTINGS_CHANGED, currentSettings);

    setAppStateDirect("ready");
    ui.hideBackgroundOverlay();
  }

  function bindEventSubscriptions() {
    bus.on(EventTypes.APP_STATE_SET, (s) => setAppStateDirect(s));
    bus.on(EventTypes.APP_SETTINGS_RESET, resetToDefaultSettings);
    bus.on(EventTypes.APP_FULL_RESET, fullReset);
  }

  return {
    init() {
      bindEventSubscriptions();
      const updateViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      };
      window.addEventListener("resize", updateViewportHeight);
      window.addEventListener("orientationchange", updateViewportHeight);
      window.addEventListener("load", updateViewportHeight);
      document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    },
  };
}

const bus = createEventBus();
const Config = createConfig();
const LangLoader = createLangLoader({ config: Config });
const Store = createStore({ bus: bus });
const WakeLock = createWakeLock({ bus: bus });
const Speaker = createSpeaker();
const UI = createUI({
  bus: bus,
  utils: Utils,
  config: Config,
  langLoader: LangLoader,
});
const Voices = createVoices({ bus: bus });
const Playback = createPlayback({
  bus: bus,
  speaker: Speaker,
  utils: Utils,
  wakeLock: WakeLock,
  uiProvider: UI,
  config: Config,
});
const App = createApp({
  bus: bus,
  config: Config,
  langLoader: LangLoader,
  store: Store,
  ui: UI,
  voices: Voices,
  speaker: Speaker,
  wakeLock: WakeLock,
  utils: Utils,
});

bus.on(EventTypes.SETTINGS_CHANGED, () => {});

App.init();
