"use strict";

/*
EventTypes
Interface: frozen map of event name constants
*/
const EventTypes = Object.freeze({
  APP_STATE: "app:state",
  APP_STATE_SET: "app:state:set",
  APP_SETTINGS_RESET: "app:settings:resetToDefault",
  APP_FULL_RESET: "app:fullReset",

  UI_BACKGROUND_SHOW: "ui:background:show",
  UI_BACKGROUND_HIDE: "ui:background:hide",
  UI_ACTIVE_NUMBER_SHOW: "ui:activeNumber:show",
  UI_ACTIVE_NUMBER_HIDE: "ui:activeNumber:hide",
  UI_HIGHLIGHT: "ui:highlight",
  UI_REPEAT_LEFT_SET: "ui:repeatLeft:set",
  UI_TEXTS_UPDATE: "ui:texts:update",

  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",

  PLAYBACK_START: "playback:start",
  PLAYBACK_RESUME: "playback:resume",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_TOGGLE: "playback:toggle",
  PLAYBACK_INDEX: "playback:currentIndex",

  SETTINGS_CHANGED: "settings:changed",
});

/*
Utils
Interface:
  - safeNumber(v, defVal)
  - safeSetSelectValue(selectEl, val, fallback)
  - delay(ms)
  - isMobileDevice()
  - normalizeString(s)
  - deepMerge(target, source)
*/
const Utils = (() => {
  const safeNumber = (v, defVal) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : defVal;
  };
  const safeSetSelectValue = (selectEl, val, fallback) => {
    if (!selectEl) return fallback;
    const values = Array.from(selectEl.options).map((o) => o.value);
    const chosen = values.includes(val) ? val : fallback;
    if (selectEl.value !== chosen) selectEl.value = chosen;
    return chosen;
  };
  const delay = (ms) => new Promise((r) => setTimeout(r, Number(ms) || 0));
  const isMobileDevice = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    );
  const normalizeString = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();
  const deepMerge = (t, s) => {
    if (!s || typeof s !== "object") return t;
    Object.keys(s).forEach((k) => {
      if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) {
        if (!t[k] || typeof t[k] !== "object") t[k] = {};
        deepMerge(t[k], s[k]);
      } else {
        t[k] = s[k];
      }
    });
    return t;
  };
  return {
    safeNumber,
    safeSetSelectValue,
    delay,
    isMobileDevice,
    normalizeString,
    deepMerge,
  };
})();

/*
EventBus
Interface:
  - on(event, fn) => unsubscribe()
  - off(event, fn)
  - emit(event, payload)
*/
function createEventBus() {
  const listeners = new Map();
  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  };
  const off = (event, fn) => listeners.get(event)?.delete(fn);
  const emit = (event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (e) {
        console.warn("Event error", event, e);
      }
    }
  };
  return { on, off, emit };
}

/*
Config
Interface:
  - PATHS, UI_LANGS, DEFAULT_CONFIG
  - CONFIG (after load)
  - load()
*/
function createConfig({ paths = null } = {}) {
  const PATHS = paths || {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
  };
  const UI_LANGS = Object.freeze([
    "de",
    "en",
    "fr",
    "nl",
    "pl",
    "pt",
    "ru",
    "tr",
    "uk",
  ]);
  const DEFAULT_CONFIG = Object.freeze({
    DEVELOPER_MODE: false,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      shared: {
        uiLang: "en",
        delay: "1000",
        speed: "1.0",
        digitLength: "2",
        count: "40",
        repeat: "1",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      mobile: {},
      desktop: {},
    },
  });

  const instance = {
    PATHS,
    UI_LANGS,
    DEFAULT_CONFIG,
    CONFIG: null,
    async load() {
      this.CONFIG = structuredClone(this.DEFAULT_CONFIG);
      try {
        const res = await fetch(this.PATHS.CONFIG);
        if (res.ok) {
          const ext = await res.json();
          if (ext && typeof ext === "object") {
            if (ext.DEFAULT_SETTINGS) {
              Utils.deepMerge(
                this.CONFIG.DEFAULT_SETTINGS,
                ext.DEFAULT_SETTINGS
              );
            }
            if (typeof ext.DEVELOPER_MODE === "boolean")
              this.CONFIG.DEVELOPER_MODE = ext.DEVELOPER_MODE;
            if (typeof ext.USE_LOCAL_STORAGE === "boolean")
              this.CONFIG.USE_LOCAL_STORAGE = ext.USE_LOCAL_STORAGE;
            if (typeof ext.DEFAULT_VOICE === "string")
              this.CONFIG.DEFAULT_VOICE = ext.DEFAULT_VOICE;
          }
        }
      } catch (e) {
        console.warn("Config load failed, using defaults", e);
      }
    },
  };
  return instance;
}

/*
LangLoader
Interface:
  - loadLang(code) => Promise<object|null>
  - loadAll() => Promise<texts>
  - getTexts(lang) => object
*/
function createLangLoader({ config }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};
  const FALLBACK_EN = {
    uiLangLabel: "Interface",
    labelLang: "Language",
    labelVoice: "Voice",
    labelDigitLength: "Digit length",
    labelCount: "Count",
    labelRepeat: "Repeat",
    labelSpeed: "Speed",
    labelDelay: "Delay (ms)",
    labelFullscreen: "Fullscreen",
    start: "Start",
    continue: "Continue",
    pause: "Pause",
    reset: "Reset",
    fillRandom: "🎲 Rnd",
    fullscreenNo: "No",
    fullscreenYes: "Yes",
    default: "Default",
    repeatsLeft: "Repeats left:",
  };
  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      console.warn(`UI texts load failed for ${code}:`, e);
      return null;
    }
  }
  async function loadAll() {
    texts = {};
    await Promise.all(
      config.UI_LANGS.map(async (code) => {
        const data = await loadLang(code);
        if (data) texts[code] = data;
      })
    );
    if (!texts.en) {
      texts.en = FALLBACK_EN;
      console.warn("EN fallback injected.");
    }
    return texts;
  }
  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;
  return { loadLang, loadAll, getTexts };
}

/*
Store
Interface:
  - getState()
  - getSettings()
  - updateSettings(patch)
  - resetSettings(defaults)
  - getAppState()
  - setAppState(newState)
  - setCurrentIndex(i)
  - loadSettings()
*/
function createStore({ config, events }) {
  const Storage = {
    KEY: "NLT:v2:settings",
    save(settings) {
      if (!config.CONFIG?.USE_LOCAL_STORAGE) return;
      try {
        localStorage.setItem(this.KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn("LS save failed", e);
      }
    },
    load() {
      if (!config.CONFIG?.USE_LOCAL_STORAGE) return null;
      try {
        const v = localStorage.getItem(this.KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        console.warn("LS load failed", e);
        return null;
      }
    },
    remove() {
      try {
        localStorage.removeItem(this.KEY);
      } catch (_e) {}
    },
  };

  let state = {
    appState: "init",
    settings: { pitch: 1.0, volume: 1.0 },
    texts: {},
    voices: [],
    availableLanguages: [],
    currentIndex: 0,
  };

  const getState = () => structuredClone(state);
  const getSettings = () => ({ ...state.settings });
  const updateSettings = (patch) => {
    state.settings = { ...state.settings, ...patch };
    Storage.save(state.settings);
    events.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
  };
  const resetSettings = (defaults) => {
    state.settings = { ...defaults };
    Storage.save(state.settings);
    events.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
  };
  const getAppState = () => state.appState;
  const setAppState = (newState) => {
    if (state.appState !== newState) {
      state.appState = newState;
      events.emit(EventTypes.APP_STATE, newState);
    }
  };
  const setCurrentIndex = (i) => {
    const idx = Math.max(0, Number(i) | 0);
    if (state.currentIndex !== idx) {
      state.currentIndex = idx;
      events.emit(EventTypes.PLAYBACK_INDEX, idx);
    }
  };
  const loadSettings = () => {
    const loaded = Storage.load();
    if (loaded) {
      state.settings = { ...state.settings, ...loaded };
      events.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
    }
    return getSettings();
  };

  return {
    getState,
    getSettings,
    updateSettings,
    resetSettings,
    getAppState,
    setAppState,
    setCurrentIndex,
    loadSettings,
  };
}

/*
WakeLock
Interface:
  - init()
  - request()
  - release()
*/
function createWakeLock({ store, config, events }) {
  const instance = {
    wakeLock: null,
    async request() {
      try {
        if ("wakeLock" in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          this.wakeLock?.addEventListener?.("release", () => {});
        }
      } catch (e) {
        console.warn("WakeLock request failed", e);
        this.wakeLock = null;
      }
    },
    release() {
      if (!this.wakeLock) return;
      try {
        this.wakeLock.release?.();
      } catch (_e) {}
      this.wakeLock = null;
    },
    init() {
      document.addEventListener("visibilitychange", () => {
        const appState = store.getAppState();
        if (document.visibilityState === "visible") {
          if (appState === "playing") this.request();
        } else {
          this.release();
        }
      });
      events.on(EventTypes.APP_STATE, (s) => {
        if (s === "playing") this.request();
        else this.release();
      });
    },
  };
  return instance;
}

/*
Speaker
Interface:
  - init(voicesProviderFn, settingsProviderFn)
  - speak(text, options)
  - cancel(), pause(), resume(), isSpeaking(), isPaused()
*/
function createSpeaker() {
  let getVoices = () => [];
  let getSettings = () => ({});
  function init(voicesProvider, settingsProvider) {
    if (typeof voicesProvider === "function") getVoices = voicesProvider;
    if (typeof settingsProvider === "function") getSettings = settingsProvider;
  }
  function speak(text, options = {}) {
    if (!text) return Promise.resolve();
    const s = { ...getSettings(), ...options };
    if (options.interrupt !== false) speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(String(text));
    if (s.voiceName) {
      const v = getVoices().find((vv) => vv.name === s.voiceName);
      if (v) utter.voice = v;
    }
    if (s.languageCode) utter.lang = s.languageCode;

    const rate =
      Number.isFinite(Number(s.rate ?? s.speed)) &&
      Number(s.rate ?? s.speed) > 0
        ? Number(s.rate ?? s.speed)
        : 1.0;
    const pitch =
      Number.isFinite(Number(s.pitch)) && Number(s.pitch) > 0
        ? Number(s.pitch)
        : 1.0;
    const volume =
      Number.isFinite(Number(s.volume)) &&
      Number(s.volume) >= 0 &&
      Number(s.volume) <= 1
        ? Number(s.volume)
        : 1.0;

    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    return new Promise((resolve) => {
      const done = () => resolve();
      utter.onend = done;
      utter.onerror = done;
      speechSynthesis.speak(utter);
    });
  }

  return {
    init,
    speak,
    cancel: () => speechSynthesis.cancel(),
    pause: () => speechSynthesis.pause(),
    resume: () => speechSynthesis.resume(),
    isSpeaking: () => speechSynthesis.speaking,
    isPaused: () => speechSynthesis.paused,
  };
}

/*
UI
Interface:
  - cache(), cacheInputs(), getInputs(), getSelectedInputs()
  - setSelectsFromSettings(s), populateLanguageSelect(), populateVoiceSelect()
  - setLanguageCodeFromSettings(), setVoiceFromSettings()
  - updateUILabels(), updateStartPauseButton(), updateControlsState()
  - showBackgroundOverlay(), hideBackgroundOverlay(), showActiveNumberOverlay(), hideActiveNumberOverlay()
  - updateSettingsFromUI(), attachEventHandlers(), bindEventSubscriptions()
  - resetRepeatLeft(), fillRandom(), highlightSelection(), elements
*/
function createUI({ events, store, utils, config, langLoader }) {
  const SELECTORS = {
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
  };

  const elements = {};
  let inputsCache = [];
  let voicesList = [];
  let availableLanguages = [];

  function cache() {
    for (const key in SELECTORS)
      elements[key] = document.querySelector(SELECTORS[key]) || null;
  }
  function cacheInputs() {
    inputsCache = elements.numberGrid
      ? Array.from(elements.numberGrid.querySelectorAll("input[type='text']"))
      : [];
  }
  const getInputs = () => inputsCache.slice();
  const getSelectedInputs = () =>
    inputsCache.filter((i) => i.classList.contains("selected"));

  function setSelectsFromSettings(s) {
    const E = elements;
    s.digitLength = utils.safeNumber(
      utils.safeSetSelectValue(E.digitLengthSelect, String(s.digitLength), "2"),
      2
    );
    s.count = utils.safeNumber(
      utils.safeSetSelectValue(E.countSelect, String(s.count), "40"),
      40
    );
    s.repeat = utils.safeNumber(
      utils.safeSetSelectValue(E.repeatSelect, String(s.repeat), "1"),
      1
    );
    s.speed = utils.safeNumber(
      utils.safeSetSelectValue(
        E.speedSelect,
        Number(s.speed).toFixed(1),
        "1.0"
      ),
      1.0
    );
    s.delay = utils.safeNumber(
      utils.safeSetSelectValue(E.delaySelect, String(s.delay), "1000"),
      1000
    );
    s.fullscreen = utils.safeSetSelectValue(
      E.fullscreenSelect,
      String(s.fullscreen),
      "0"
    );
    if (s.uiLang && E.uiLangSelect) E.uiLangSelect.value = s.uiLang;
    if (E.languageCodeSelect) {
      const langPart = (s.languageCode || "ALL").split(/[-_]/)[0].toUpperCase();
      E.languageCodeSelect.value = langPart;
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
    const configLang = (
      (store.getSettings().languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    el.value = availableLanguages.includes(configLang)
      ? configLang
      : utils.isMobileDevice()
      ? "ALL"
      : el.value;
  }

  function populateVoiceSelect() {
    const el = elements.voiceSelect;
    if (!el || !voicesList.length) return;
    const isMobile = utils.isMobileDevice();
    const selectedLang = (
      elements.languageCodeSelect?.value || "ALL"
    ).toUpperCase();
    const voicesToShow =
      isMobile || selectedLang === "ALL"
        ? voicesList
        : voicesList.filter((v) =>
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
    const requestedVoice = utils.normalizeString(
      store.getSettings().voiceName || ""
    );
    const requestedLang = utils.normalizeString(
      store.getSettings().languageCode || ""
    );
    let match = null;
    match = isMobile
      ? voicesToShow.find(
          (v) => utils.normalizeString(v.lang) === requestedLang
        )
      : voicesToShow.find(
          (v) => utils.normalizeString(v.name) === requestedVoice
        );
    if (!match && voicesToShow.length) match = voicesToShow[0];
    if (match && el.value !== match.name) el.value = match.name;

    const s = store.getSettings();
    if (el.value && s.voiceName !== el.value)
      store.updateSettings({ voiceName: el.value });
  }

  function setLanguageCodeFromSettings() {
    const E = elements;
    const langPart = (
      (store.getSettings().languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    if (E.languageCodeSelect && E.languageCodeSelect.value !== langPart) {
      E.languageCodeSelect.value = langPart;
    }
  }
  function setVoiceFromSettings() {
    const E = elements;
    const voice = store.getSettings().voiceName;
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
      const val = labels[store.getAppState()] || texts.start;
      if (btn.textContent !== val) btn.textContent = val;
    }
  }

  function updateControlsState() {
    const s = store.getAppState();
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
    setDisabled(elements.fillRandomBtn, !(isReady || isPaused));
    setDisabled(elements.resetBtn, !isPaused);
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
    setTimeout(
      () => overlay.classList.remove("show"),
      1000 + Number(delayMs || 0)
    );
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
    upd("digitLength", E.digitLengthSelect, store.getSettings().digitLength);
    upd("count", E.countSelect, store.getSettings().count);
    upd("repeat", E.repeatSelect, store.getSettings().repeat);
    upd("uiLang", E.uiLangSelect, store.getSettings().uiLang);
    upd("languageCode", E.languageCodeSelect, store.getSettings().languageCode);
    upd("voiceName", E.voiceSelect, store.getSettings().voiceName);
    upd("speed", E.speedSelect, store.getSettings().speed);
    upd("delay", E.delaySelect, store.getSettings().delay);
    upd("fullscreen", E.fullscreenSelect, store.getSettings().fullscreen);
    store.updateSettings(s);
  }

  function attachEventHandlers() {
    const E = elements;

    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      updateSettingsFromUI();
    });

    if (!utils.isMobileDevice()) {
      E.languageCodeSelect?.addEventListener("change", () => {
        store.updateSettings({ languageCode: E.languageCodeSelect.value });
        populateVoiceSelect();
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
    E.delaySelect?.addEventListener("change", () => updateSettingsFromUI());

    E.fillRandomBtn?.addEventListener("click", () => {
      fillRandom();
      highlightSelection();
    });

    E.fullscreenSelect?.addEventListener("change", () =>
      updateSettingsFromUI()
    );

    E.resetSettingsBtn?.addEventListener("click", () =>
      events.emit(EventTypes.APP_SETTINGS_RESET)
    );
    E.startPauseBtn?.addEventListener("click", () =>
      events.emit(EventTypes.PLAYBACK_TOGGLE)
    );
    E.resetBtn?.addEventListener("click", () =>
      events.emit(EventTypes.APP_FULL_RESET)
    );
  }

  function resetRepeatLeft() {
    if (elements.repeatLeft && elements.repeatSelect) {
      const val = elements.repeatSelect.value;
      if (elements.repeatLeft.textContent !== val)
        elements.repeatLeft.textContent = val;
    }
    updateControlsState();
  }

  function fillRandom() {
    const maxValue =
      10 ** utils.safeNumber(store.getSettings().digitLength, 2) - 1;
    getInputs().forEach((input) => {
      input.value = String(Math.floor(Math.random() * (maxValue + 1)));
    });
  }

  function highlightSelection() {
    const count = Number(store.getSettings().count || 0);
    const ci = store.getState().currentIndex || 0;
    getInputs().forEach((input, idx) => {
      const sel = idx < count;
      const hi = idx === ci;
      if (input.classList.contains("selected") !== sel)
        input.classList.toggle("selected", sel);
      if (input.classList.contains("highlight") !== hi)
        input.classList.toggle("highlight", hi);
    });
  }

  function bindEventSubscriptions() {
    events.on(EventTypes.UI_BACKGROUND_SHOW, showBackgroundOverlay);
    events.on(EventTypes.UI_BACKGROUND_HIDE, hideBackgroundOverlay);
    events.on(EventTypes.UI_ACTIVE_NUMBER_SHOW, ({ value, delayMs }) =>
      showActiveNumberOverlay(value, delayMs)
    );
    events.on(EventTypes.UI_ACTIVE_NUMBER_HIDE, hideActiveNumberOverlay);
    events.on(EventTypes.UI_HIGHLIGHT, highlightSelection);
    events.on(EventTypes.UI_REPEAT_LEFT_SET, (val) => {
      if (
        elements.repeatLeft &&
        String(elements.repeatLeft.textContent) !== String(val)
      ) {
        elements.repeatLeft.textContent = String(val);
      }
      updateControlsState();
    });
    events.on(EventTypes.APP_STATE, () => {
      updateStartPauseButton();
      updateControlsState();
    });
    events.on(EventTypes.UI_TEXTS_UPDATE, updateUILabels);

    events.on(
      EventTypes.VOICES_CHANGED,
      ({ voices, availableLanguages: langs }) => {
        voicesList = (voices || []).map((v) => ({
          name: v.name,
          lang: v.lang,
        }));
        availableLanguages = (langs || []).slice();
        if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
        populateLanguageSelect();
        populateVoiceSelect();
      }
    );

    events.on(
      EventTypes.VOICES_LOADED,
      ({ voices, availableLanguages: langs }) => {
        voicesList = (voices || []).map((v) => ({
          name: v.name,
          lang: v.lang,
        }));
        availableLanguages = (langs || []).slice();
        if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
        populateLanguageSelect();
        populateVoiceSelect();
      }
    );

    events.on(EventTypes.SETTINGS_CHANGED, (newSettings) => {
      setSelectsFromSettings(newSettings);
      setLanguageCodeFromSettings();
      setVoiceFromSettings();
      updateUILabels();
      highlightSelection();
    });

    events.on(EventTypes.PLAYBACK_INDEX, () => highlightSelection());
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
    elements,
  };
}

/*
Voices
Interface:
  - collect()
  - load()
  - getVoices() => array
*/
function createVoices({ events }) {
  let voices = [];
  let availableLanguages = [];

  function computeAvailableLanguages() {
    availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => (v.lang || "").split("-")[0].toUpperCase())
          .filter(Boolean)
      )
    )
      .sort()
      .concat([]);
    if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
  }

  function publish(evt) {
    const lightweight = voices.map((v) => ({ name: v.name, lang: v.lang }));
    events.emit(evt, {
      voices: lightweight,
      availableLanguages: availableLanguages.slice(),
    });
  }

  function collect() {
    voices = speechSynthesis.getVoices() || [];
    computeAvailableLanguages();
    publish(EventTypes.VOICES_CHANGED);
  }

  async function load() {
    collect();
    if (!voices.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await Utils.delay(250);
        collect();
      } catch (err) {
        console.warn("Voices.load fallback failed", err);
      }
    }
    publish(EventTypes.VOICES_LOADED);
  }

  if ("onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => collect();
  }

  return { collect, load, getVoices: () => voices.slice() };
}

/*
Playback
Interface:
  - buildPlayQueue()
  - internal: responds to EventTypes for control
*/
function createPlayback({
  events,
  store,
  speaker,
  utils,
  wakeLock,
  uiProvider,
  config,
}) {
  function buildPlayQueue() {
    return uiProvider
      .getSelectedInputs()
      .map((i) => ({ value: i.value, el: i }));
  }

  function resetRuntime(runtime) {
    store.setCurrentIndex(0);
    runtime.playQueue = [];
    runtime.repeatsRemaining = utils.safeNumber(store.getSettings().repeat, 1);
  }

  async function playSequence(runtime) {
    if (store.getAppState() !== "playing") return;
    const delayMs = utils.safeNumber(store.getSettings().delay, 500);

    while (store.getAppState() === "playing") {
      if (store.getState().currentIndex >= runtime.playQueue.length) {
        if (runtime.repeatsRemaining > 1) {
          runtime.repeatsRemaining -= 1;
          events.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
          store.setCurrentIndex(0);
        } else {
          events.emit(EventTypes.APP_STATE_SET, "ready");
          events.emit(EventTypes.UI_BACKGROUND_HIDE);
          events.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
          resetRuntime(runtime);
          events.emit(EventTypes.UI_HIGHLIGHT);
          wakeLock.release();
          return;
        }
      }

      const idx = store.getState().currentIndex;
      const item = runtime.playQueue[idx];
      if (!item || !item.value) {
        store.setCurrentIndex(idx + 1);
        await utils.delay(delayMs);
        continue;
      }

      events.emit(EventTypes.UI_HIGHLIGHT);
      events.emit(EventTypes.UI_BACKGROUND_SHOW);
      events.emit(EventTypes.UI_ACTIVE_NUMBER_SHOW, {
        value: item.value,
        delayMs,
      });

      await speaker.speak(item.value, {
        languageCode: store.getSettings().languageCode || "nl-NL",
        speed: store.getSettings().speed,
        pitch: store.getSettings().pitch,
        volume: store.getSettings().volume,
        voiceName: store.getSettings().voiceName,
      });

      if (store.getAppState() !== "playing") break;
      store.setCurrentIndex(idx + 1);
      await utils.delay(delayMs);
    }
  }

  const runtime = { playQueue: [], repeatsRemaining: 1 };

  events.on(EventTypes.PLAYBACK_START, () => {
    runtime.repeatsRemaining = utils.safeNumber(store.getSettings().repeat, 1);
    events.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
    runtime.playQueue = buildPlayQueue();
    store.setCurrentIndex(0);
    events.emit(EventTypes.APP_STATE_SET, "playing");
    events.emit(EventTypes.UI_BACKGROUND_SHOW);
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });

  events.on(EventTypes.PLAYBACK_RESUME, () => {
    events.emit(EventTypes.APP_STATE_SET, "playing");
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });

  events.on(EventTypes.PLAYBACK_PAUSE, () => {
    speaker.cancel();
    events.emit(EventTypes.APP_STATE_SET, "paused");
    events.emit(EventTypes.UI_BACKGROUND_HIDE);
    events.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
  });

  events.on(EventTypes.PLAYBACK_STOP, () => {
    speaker.cancel();
    events.emit(EventTypes.APP_STATE_SET, "ready");
    events.emit(EventTypes.UI_BACKGROUND_HIDE);
    events.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
    resetRuntime(runtime);
    events.emit(
      EventTypes.UI_REPEAT_LEFT_SET,
      utils.safeNumber(store.getSettings().repeat, 1)
    );
    events.emit(EventTypes.UI_HIGHLIGHT);
    wakeLock.release();
  });

  events.on(EventTypes.PLAYBACK_TOGGLE, () => {
    const appState = store.getAppState();
    if (appState === "playing") return events.emit(EventTypes.PLAYBACK_PAUSE);
    if (appState === "paused") return events.emit(EventTypes.PLAYBACK_RESUME);
    events.emit(EventTypes.PLAYBACK_START);
  });

  return { buildPlayQueue };
}

/*
App
Interface:
  - init()
*/
function createApp({
  events,
  config,
  langLoader,
  store,
  ui,
  voices,
  speaker,
  wakeLock,
  utils,
}) {
  function defaultSettings() {
    const shared = config.DEFAULT_CONFIG.DEFAULT_SETTINGS.shared;
    const type = utils.isMobileDevice() ? "mobile" : "desktop";
    return {
      ...shared,
      ...(config.DEFAULT_CONFIG.DEFAULT_SETTINGS[type] || {}),
    };
  }

  function setAppStateDirect(s) {
    store.setAppState(s);
    if (s === "playing") wakeLock.request();
    else wakeLock.release();
  }

  function resetToDefaultSettings() {
    speaker.cancel();
    events.emit(EventTypes.PLAYBACK_STOP);
    const defaults = defaultSettings();
    store.resetSettings(defaults);
    ui.setSelectsFromSettings(store.getSettings());
    if (ui.elements.languageCodeSelect) {
      ui.populateLanguageSelect();
      ui.setLanguageCodeFromSettings();
      setTimeout(() => ui.populateVoiceSelect(), 0);
    }
    if (ui.elements.voiceSelect) ui.setVoiceFromSettings();
    ui.fillRandom();
    ui.highlightSelection();
    ui.resetRepeatLeft();
  }

  function fullReset() {
    speaker.cancel();
    events.emit(EventTypes.PLAYBACK_STOP);
  }

  function handleKeyControls(event) {
    const tag = document.activeElement?.tagName || "";
    const isTyping = ["INPUT", "TEXTAREA"].includes(tag);
    if (
      event.key === "Escape" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      event.preventDefault();
      events.emit(EventTypes.APP_FULL_RESET);
    }
    if (
      (event.key === " " || event.code === "Space" || event.keyCode === 32) &&
      !isTyping
    ) {
      event.preventDefault();
      events.emit(EventTypes.PLAYBACK_TOGGLE);
    }
  }

  async function handleDOMContentLoaded() {
    ui.bindEventSubscriptions();
    ui.cache();
    await config.load();

    const stored = config.CONFIG?.USE_LOCAL_STORAGE
      ? store.loadSettings()
      : null;
    const st =
      stored ||
      (config.CONFIG
        ? {
            ...config.CONFIG.DEFAULT_SETTINGS.shared,
            ...(config.CONFIG.DEFAULT_SETTINGS[
              utils.isMobileDevice() ? "mobile" : "desktop"
            ] || {}),
          }
        : defaultSettings());
    store.resetSettings(st);
    ui.setSelectsFromSettings(store.getSettings());

    await langLoader.loadAll();
    if (ui.elements.uiLangSelect) {
      const chosen = ui.elements.uiLangSelect.value || "en";
      ui.elements.uiLangSelect.value = chosen;
      store.updateSettings({ uiLang: chosen });
    }
    ui.updateUILabels();

    setAppStateDirect("ready");
    ui.hideBackgroundOverlay();

    await voices.load();

    if (utils.isMobileDevice()) {
      [ui.elements.languageCodeSelect, ui.elements.labelLanguageCode].forEach(
        (el) => el && (el.style.display = "none")
      );
    }

    ui.cacheInputs();
    ui.populateLanguageSelect();
    ui.setLanguageCodeFromSettings();
    ui.populateVoiceSelect();
    ui.setVoiceFromSettings();
    ui.fillRandom();
    ui.highlightSelection();
    ui.attachEventHandlers();
    ui.elements.resetBtn?.addEventListener("click", () =>
      events.emit(EventTypes.APP_FULL_RESET)
    );
    if (ui.elements.startPauseBtn) ui.elements.startPauseBtn.disabled = false;
    ui.resetRepeatLeft();
    document.addEventListener("keydown", handleKeyControls);

    if (ui.elements.developerPanel) {
      ui.elements.developerPanel.style.display = config.CONFIG.DEVELOPER_MODE
        ? "flex"
        : "none";
    }

    speaker.init(
      () => voices.getVoices(),
      () => store.getSettings()
    );
    wakeLock.init();
  }

  function bindEventSubscriptions() {
    events.on(EventTypes.APP_STATE_SET, (s) => setAppStateDirect(s));
    events.on(EventTypes.APP_SETTINGS_RESET, resetToDefaultSettings);
    events.on(EventTypes.APP_FULL_RESET, fullReset);
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

/* ===== Wire together (single-file) ===== */

const Events = createEventBus();
const Config = createConfig();
const LangLoader = createLangLoader({ config: Config });
const Store = createStore({ config: Config, events: Events });
const WakeLock = createWakeLock({
  store: Store,
  config: Config,
  events: Events,
});
const Speaker = createSpeaker();
const UI = createUI({
  events: Events,
  store: Store,
  utils: Utils,
  config: Config,
  langLoader: LangLoader,
});
const Voices = createVoices({ events: Events });
const Playback = createPlayback({
  events: Events,
  store: Store,
  speaker: Speaker,
  utils: Utils,
  wakeLock: WakeLock,
  uiProvider: UI,
  config: Config,
});
const App = createApp({
  events: Events,
  config: Config,
  langLoader: LangLoader,
  store: Store,
  ui: UI,
  voices: Voices,
  speaker: Speaker,
  wakeLock: WakeLock,
  utils: Utils,
});

/* reserved subscription */
Events.on(EventTypes.SETTINGS_CHANGED, () => {});

/* start app */
App.init();
