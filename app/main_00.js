"use strict";
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
  PLAYBACK_INDEX_SET: "playback:currentIndex:set",
  PLAYBACK_FINISH: "playback:finish",
  SETTINGS_CHANGED: "settings:changed",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_LOAD: "settings:load",
  SETTINGS_SAVE: "settings:save",
  SETTINGS_RESET: "settings:reset",
  SPEECH_START: "speech:start",
  SPEECH_END: "speech:end",
});
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
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
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
      } else t[k] = s[k];
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
        console.warn("Event handler error", event, e);
      }
    }
  };
  return { on, off, emit };
}
function createConfig({ paths = null } = {}) {
  const PATHS = paths || {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
  };
  const UI_LANGS = Object.freeze([
    "ar",
    "de",
    "en",
    "fr",
    "nl",
    "pl",
    "pt",
    "ru",
    "tr",
    "uk",
    "ru",
  ]);
  const DEFAULT_CONFIG = Object.freeze({
    DEVELOPER_MODE: true,
    USE_LOCAL_STORAGE: 0,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      shared: {
        uiLang: "en",
        delay: "1000",
        speed: "1.0",
        digitLength: "2",
        count: "40",
        repeat: "1",
        fullscreen: true,
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      mobile: { fullscreen: true },
      desktop: { fullscreen: false },
    },
  });
  const instance = {
    PATHS,
    UI_LANGS,
    DEFAULT_CONFIG,
    CONFIG: null,
    CONFIG_EXT: null,
    async load() {
      this.CONFIG = structuredClone(this.DEFAULT_CONFIG);
      function parseBinary(val, defaultVal = false) {
        if (typeof val === "string") {
          const lower = val.toLowerCase();
          if (lower === "true" || lower === "1") return true;
          if (lower === "false" || lower === "0") return false;
        }
        if (val === true || val === 1) return true;
        if (val === false || val === 0) return false;
        return defaultVal;
      }
      try {
        const res = await fetch(this.PATHS.CONFIG);
        if (res.ok) {
          const ext = await res.json();
          if (ext && typeof ext === "object") this.CONFIG_EXT = ext;
        }
      } catch (e) {
        console.warn("Config load failed, using defaults", e);
      }
      if (this.CONFIG_EXT) {
        if ("DEVELOPER_MODE" in this.CONFIG_EXT)
          this.CONFIG.DEVELOPER_MODE = this.CONFIG_EXT.DEVELOPER_MODE;
        if ("USE_LOCAL_STORAGE" in this.CONFIG_EXT)
          this.CONFIG.USE_LOCAL_STORAGE = this.CONFIG_EXT.USE_LOCAL_STORAGE;
        if (typeof this.CONFIG_EXT.DEFAULT_VOICE === "string")
          this.CONFIG.DEFAULT_VOICE = this.CONFIG_EXT.DEFAULT_VOICE;
        const mergeIf = this.CONFIG_EXT.DEFAULT_SETTINGS || {};
        const sharedExt = mergeIf.shared || {};
        const mobileExt = mergeIf.mobile || {};
        const desktopExt = mergeIf.desktop || {};
        const mergedShared = Utils.deepMerge(
          structuredClone(this.CONFIG.DEFAULT_SETTINGS.shared),
          sharedExt
        );
        const mergedMobile = Utils.deepMerge(
          structuredClone(this.CONFIG.DEFAULT_SETTINGS.mobile),
          mobileExt
        );
        const mergedDesktop = Utils.deepMerge(
          structuredClone(this.CONFIG.DEFAULT_SETTINGS.desktop),
          desktopExt
        );
        this.CONFIG.DEFAULT_SETTINGS = {
          shared: mergedShared,
          mobile: mergedMobile,
          desktop: mergedDesktop,
        };
      }
      this.CONFIG.DEVELOPER_MODE = parseBinary(this.CONFIG.DEVELOPER_MODE);
      this.CONFIG.USE_LOCAL_STORAGE = parseBinary(
        this.CONFIG.USE_LOCAL_STORAGE
      );
      ["shared", "mobile", "desktop"].forEach((k) => {
        const set = this.CONFIG.DEFAULT_SETTINGS[k];
        if (set && "fullscreen" in set)
          set.fullscreen = parseBinary(set.fullscreen) ? 1 : 0;
      });
      return this.CONFIG;
    },
  };
  return instance;
}
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
      (config.UI_LANGS || []).map(async (code) => {
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
function createStore({ config, bus }) {
  const Storage = {
    KEY: "NLT-settings",
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
  const getSettings = () => structuredClone(state.settings);
  const updateSettings = (patch) => {
    if (!patch || typeof patch !== "object") return;
    state.settings = { ...state.settings, ...patch };
    Storage.save(state.settings);
    bus.emit(EventTypes.SETTINGS_CHANGED, structuredClone(state.settings));
  };
  const resetSettings = (defaults) => {
    state.settings = { ...defaults };
    Storage.save(state.settings);
    bus.emit(EventTypes.SETTINGS_CHANGED, structuredClone(state.settings));
  };
  const getAppState = () => state.appState;
  const setAppState = (newState) => {
    if (state.appState !== newState) {
      state.appState = newState;
      bus.emit(EventTypes.APP_STATE, newState);
    }
  };
  const setCurrentIndex = (i) => {
    const idx = Math.max(0, Number(i) | 0);
    if (state.currentIndex !== idx) {
      state.currentIndex = idx;
      bus.emit(EventTypes.PLAYBACK_INDEX, idx);
    }
  };
  const loadSettings = () => {
    const loaded = Storage.load();
    if (loaded) {
      state.settings = { ...state.settings, ...loaded };
      bus.emit(EventTypes.SETTINGS_CHANGED, structuredClone(state.settings));
    }
    return getSettings();
  };
  bus.on(EventTypes.SETTINGS_UPDATE, (patch) => {
    if (patch && typeof patch === "object") updateSettings(patch);
  });
  bus.on(EventTypes.PLAYBACK_INDEX_SET, (i) => setCurrentIndex(i));
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
function createWakeLock({ bus } = {}) {
  let wakeLock = null;
  async function request() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock?.addEventListener?.("release", () => {});
      }
      return !!wakeLock;
    } catch (e) {
      console.warn("WakeLock request failed", e);
      wakeLock = null;
      return false;
    }
  }
  async function release() {
    try {
      if (wakeLock) {
        await (wakeLock.release?.() || Promise.resolve());
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }
  function init() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        bus.emit(EventTypes.APP_STATE, "resume-visibility");
      } else {
        release();
      }
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      if (s === "playing") request();
      else release();
    });
  }
  return { request, release, init };
}
function createSpeaker({ bus, voicesProvider, settingsProvider } = {}) {
  const emitter = bus;
  let getVoices = () =>
    typeof voicesProvider === "function" ? voicesProvider() : [];
  let getSettings = () =>
    typeof settingsProvider === "function" ? settingsProvider() : {};
  let currentUtterance = null;
  function init(voicesProv, settingsProv) {
    if (typeof voicesProv === "function") getVoices = voicesProv;
    if (typeof settingsProv === "function") getSettings = settingsProv;
  }
  function _selectVoice(s) {
    const all = getVoices() || [];
    if (!all.length) return null;
    const desiredName = String(s.voiceName || "").trim();
    const desiredLang = String(s.languageCode || "")
      .trim()
      .toLowerCase();
    if (desiredName) {
      let exact = all.find((v) => v.name === desiredName);
      if (exact) return exact;
      const norm = (n) =>
        String(n || "")
          .trim()
          .toLowerCase();
      let partial = all.find((v) => norm(v.name).includes(norm(desiredName)));
      if (partial) return partial;
    }
    if (desiredLang) {
      const langFull = desiredLang;
      let byFull = all.find((v) => (v.lang || "").toLowerCase() === langFull);
      if (byFull) return byFull;
      const base = langFull.split(/[-_]/)[0];
      if (base) {
        let byBase = all.find(
          (v) => ((v.lang || "").split(/[-_]/)[0] || "").toLowerCase() === base
        );
        if (byBase) return byBase;
      }
    }
    const navBase = (navigator.language || "").split(/[-_]/)[0];
    if (navBase) {
      const navMatch = all.find((v) =>
        (v.lang || "").toLowerCase().startsWith(navBase)
      );
      if (navMatch) return navMatch;
    }
    return all[0] || null;
  }
  async function speakAsync(text, options = {}) {
    if (!text) return;
    const settings =
      (typeof getSettings === "function" ? getSettings() : {}) || {};
    const s = { ...settings, ...options };
    if (options.interrupt !== false && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
      } catch (_e) {}
    }
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(String(text));
      const chosen = _selectVoice(s);
      if (chosen) {
        try {
          utter.voice = chosen;
          utter.lang = chosen.lang || s.languageCode || utter.lang || "";
        } catch (e) {
          if (s.languageCode) utter.lang = s.languageCode;
        }
      } else {
        if (s.languageCode) utter.lang = s.languageCode;
      }
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
        const done = () => {
          currentUtterance = null;
          emitter?.emit?.(EventTypes.SPEECH_END, {
            button: options.button || null,
          });
          resolve(true);
        };
        utter.onend = done;
        utter.onerror = done;
        currentUtterance = utter;
        emitter?.emit?.(EventTypes.SPEECH_START, {
          button: options.button || null,
        });
        speechSynthesis.speak(utter);
      });
    }
    if (window.fetch) {
      try {
        const res = await fetch("/speak", {
          method: "POST",
          body: JSON.stringify({ text, opts: options }),
          headers: { "Content-Type": "application/json" },
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
    return false;
  }
  function speak(obj) {
    if (!obj) return;
    if (typeof obj === "string")
      return speakAsync(obj).catch((e) => console.warn("speak failed", e));
    const { text, rate = 1, lang, button, voiceName, pitch, volume } = obj;
    return speakAsync(text, {
      rate,
      languageCode: lang,
      speed: rate,
      voiceName,
      pitch,
      volume,
      button,
    }).catch((e) => console.warn("speak failed", e));
  }
  function cancel() {
    try {
      if ("speechSynthesis" in window) {
        if (speechSynthesis.speaking || speechSynthesis.pending)
          speechSynthesis.cancel();
      }
    } catch (_e) {}
    if (currentUtterance) {
      emitter?.emit?.(EventTypes.SPEECH_END, { button: null });
      currentUtterance = null;
    }
  }
  const pause = () => {
    try {
      speechSynthesis.pause();
    } catch (_e) {}
  };
  const resume = () => {
    try {
      speechSynthesis.resume();
    } catch (_e) {}
  };
  const isSpeaking = () =>
    "speechSynthesis" in window && speechSynthesis.speaking;
  const isPaused = () => "speechSynthesis" in window && speechSynthesis.paused;
  return {
    init,
    speak,
    speakAsync,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    _selectVoice,
  };
}
function createUI({ bus, store, config, langLoader, utils }) {
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
  let currentSettings = { pitch: 1.0, volume: 1.0 };
  let currentAppState = "init";
  let currentIndex = 0;
  function cache() {
    for (const key in SELECTORS)
      elements[key] = document.querySelector(SELECTORS[key]) || null;
  }
  function cacheInputs() {
    inputsCache = elements.numberGrid
      ? Array.from(
          elements.numberGrid.querySelectorAll(
            "input[type='text'],input[type='number'],input[type='tel']"
          )
        )
      : [];
  }
  const getInputs = () => inputsCache.slice();
  const getSelectedInputs = () => {
    const cnt = Number(currentSettings.count || 0);
    return getInputs().slice(0, cnt);
  };
  function setSelectsFromSettings(s) {
    if (!s) return;
    currentSettings = { ...currentSettings, ...s };
    if (elements.speedSelect)
      utils.safeSetSelectValue(
        elements.speedSelect,
        String(currentSettings.speed || "1"),
        elements.speedSelect.options[0]?.value || "1"
      );
    if (elements.delaySelect)
      utils.safeSetSelectValue(
        elements.delaySelect,
        String(currentSettings.delay || "1000"),
        elements.delaySelect.options[0]?.value || "0"
      );
    if (elements.digitLengthSelect)
      utils.safeSetSelectValue(
        elements.digitLengthSelect,
        String(currentSettings.digitLength || "2"),
        elements.digitLengthSelect.options[0]?.value || "1"
      );
    if (elements.countSelect)
      utils.safeSetSelectValue(
        elements.countSelect,
        String(currentSettings.count || "10"),
        elements.countSelect.options[0]?.value || "10"
      );
    if (elements.repeatSelect)
      utils.safeSetSelectValue(
        elements.repeatSelect,
        String(currentSettings.repeat || "1"),
        elements.repeatSelect.options[0]?.value || "1"
      );
    if (elements.fullscreenSelect)
      utils.safeSetSelectValue(
        elements.fullscreenSelect,
        String(currentSettings.fullscreen || "0"),
        elements.fullscreenSelect.options[0]?.value || "0"
      );
    if (elements.uiLangSelect)
      utils.safeSetSelectValue(
        elements.uiLangSelect,
        String(currentSettings.uiLang || "en"),
        elements.uiLangSelect.options[0]?.value || "en"
      );
    if (elements.voiceSelect)
      utils.safeSetSelectValue(
        elements.voiceSelect,
        String(currentSettings.voiceName || ""),
        elements.voiceSelect.options[0]?.value || ""
      );
  }
  function populateLanguageSelect() {
    const el = elements.languageCodeSelect;
    if (!el) return;
    const langs = (availableLanguages || []).slice();
    if (!langs.includes("ALL")) langs.unshift("ALL");
    const frag = document.createDocumentFragment();
    langs.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      frag.appendChild(opt);
    });
    Array.from(document.querySelectorAll(SELECTORS.languageCodeSelect)).forEach(
      (sel) => sel.replaceChildren(frag.cloneNode(true))
    );
  }
  function populateVoiceSelect() {
    const el = elements.voiceSelect;
    if (!el) return;
    const frag = document.createDocumentFragment();
    voicesList.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang || ""})`;
      frag.appendChild(opt);
    });
    if (el) el.replaceChildren(frag);
    if (voicesList.length) {
      const match =
        voicesList.find(
          (v) =>
            utils.normalizeString(v.name) ===
            utils.normalizeString(currentSettings.voiceName)
        ) || voicesList[0];
      if (match) {
        if (el.value !== match.name) {
          el.value = match.name;
          bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
        }
      }
    }
  }
  function setLanguageCodeFromSettings() {
    const langPart = (
      (currentSettings.languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    const sel = document.querySelector(SELECTORS.languageCodeSelect);
    if (sel && sel.value !== langPart) sel.value = langPart;
  }
  function setVoiceFromSettings() {
    const el = elements.voiceSelect;
    if (!el) return;
    const sVoice = currentSettings.voiceName || "";
    if (sVoice && !Array.from(el.options).some((o) => o.value === sVoice)) {
      if (el.options.length) el.value = el.options[0].value;
    } else if (sVoice && el.value !== sVoice) {
      el.value = sVoice;
    }
  }
  function setText(el, text) {
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
  }
  function updateUILabels() {
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    if (!texts) return;
    setText(elements.uiLangLabel, texts.uiLangLabel);
    setText(elements.labelDigitLength, texts.labelDigitLength);
    setText(elements.labelCount, texts.labelCount);
    setText(elements.labelRepeat, texts.labelRepeat);
    setText(elements.labelSpeed, texts.labelSpeed);
    setText(elements.labelDelay, texts.labelDelay);
    setText(elements.labelVoice, texts.labelVoice);
    setText(elements.labelFullscreen, texts.labelFullscreen);
    setText(elements.fillRandomBtn, texts.fillRandom);
    setText(elements.resetBtn, texts.reset);
    setText(elements.labelRepeatsText, texts.repeatsLeft);
    if (elements.fullscreenSelect) {
      if (elements.fullscreenSelect.options[0])
        elements.fullscreenSelect.options[0].textContent = texts.fullscreenNo;
      if (elements.fullscreenSelect.options[1])
        elements.fullscreenSelect.options[1].textContent = texts.fullscreenYes;
    }
    updateStartPauseButton();
    updateControlsState();
  }
  function updateStartPauseButton() {
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    if (!texts) return;
    const labels = {
      playing: texts.pause,
      paused: texts.continue,
      ready: texts.start,
    };
    const btn = elements.startPauseBtn;
    const val = labels[currentAppState] || texts.start;
    if (btn && btn.textContent !== val) btn.textContent = val;
  }
  function updateControlsState() {
    const s = currentAppState;
    const isPlaying = s === "playing";
    const isPaused = s === "paused";
    const isReady = s === "ready";
    const setDisabled = (el, val) => {
      if (!el) return;
      if (el.disabled !== val) el.disabled = val;
    };
    const toggleClass = (el, cls, on) => {
      if (!el) return;
      el.classList.toggle(cls, !!on);
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
    if (E.speedSelect) s.speed = Number(E.speedSelect.value || 1);
    if (E.delaySelect) s.delay = Number(E.delaySelect.value || 0);
    if (E.digitLengthSelect)
      s.digitLength = Number(E.digitLengthSelect.value || 1);
    if (E.countSelect) s.count = Number(E.countSelect.value || 10);
    if (E.repeatSelect) s.repeat = Number(E.repeatSelect.value || 1);
    if (E.fullscreenSelect)
      s.fullscreen = Number(E.fullscreenSelect.value || 0);
    if (E.uiLangSelect) s.uiLang = E.uiLangSelect.value;
    if (E.voiceSelect) s.voiceName = E.voiceSelect.value;
    bus.emit(EventTypes.SETTINGS_UPDATE, s);
  }
  function highlightSelection() {
    const cnt = Number(currentSettings.count || 0);
    const ci = currentIndex || 0;
    getInputs().forEach((input, idx) => {
      const sel = idx < cnt;
      const hi = idx === ci;
      input.classList.toggle("selected", sel);
      input.classList.toggle("highlight", hi);
    });
  }
  function attachEventHandlers() {
    const E = elements;
    E.fillRandomBtn?.addEventListener("click", () => {
      fillRandom();
    });
    E.resetSettingsBtn?.addEventListener("click", () => {
      bus.emit(
        EventTypes.SETTINGS_UPDATE,
        structuredClone(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.shared)
      );
    });
    E.startPauseBtn?.addEventListener("click", () =>
      bus.emit(EventTypes.PLAYBACK_TOGGLE)
    );
    E.resetBtn?.addEventListener("click", () =>
      bus.emit(EventTypes.PLAYBACK_STOP)
    );
    E.voiceSelect?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: E.voiceSelect.value })
    );
    E.languageCodeSelect &&
      Array.from(
        document.querySelectorAll(SELECTORS.languageCodeSelect)
      ).forEach((el) =>
        el.addEventListener("change", () =>
          bus.emit(EventTypes.SETTINGS_UPDATE, { languageCode: el.value })
        )
      );
    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      bus.emit(EventTypes.SETTINGS_UPDATE, { uiLang: E.uiLangSelect.value });
    });
  }
  function bindEventSubscriptions() {
    bus.on(EventTypes.UI_BACKGROUND_SHOW, showBackgroundOverlay);
    bus.on(EventTypes.UI_BACKGROUND_HIDE, hideBackgroundOverlay);
    bus.on(EventTypes.UI_ACTIVE_NUMBER_SHOW, ({ value, delayMs }) =>
      showActiveNumberOverlay(value, delayMs)
    );
    bus.on(EventTypes.UI_ACTIVE_NUMBER_HIDE, hideActiveNumberOverlay);
    bus.on(EventTypes.UI_HIGHLIGHT, highlightSelection);
    bus.on(EventTypes.UI_REPEAT_LEFT_SET, (val) => {
      if (
        elements.repeatLeft &&
        String(elements.repeatLeft.textContent) !== String(val)
      )
        elements.repeatLeft.textContent = String(val);
      updateControlsState();
    });
    bus.on(
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
    bus.on(
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
    bus.on(EventTypes.SETTINGS_CHANGED, (newSettings) => {
      currentSettings = { ...currentSettings, ...newSettings };
      setSelectsFromSettings(newSettings);
      setLanguageCodeFromSettings();
      setVoiceFromSettings();
      updateUILabels();
      highlightSelection();
    });
    bus.on(EventTypes.PLAYBACK_INDEX, (idx) => {
      currentIndex = idx;
      highlightSelection();
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      currentAppState = s;
      updateStartPauseButton();
      updateControlsState();
    });
    bus.on(EventTypes.UI_TEXTS_UPDATE, updateUILabels);
  }
  function resetRepeatLeft() {
    if (elements.repeatLeft) elements.repeatLeft.textContent = "0";
    bus.emit(EventTypes.UI_REPEAT_LEFT_SET, 0);
  }
  function fillRandom() {
    cacheInputs();
    getInputs().forEach((i) => {
      i.value = Math.floor(Math.random() * 1000);
    });
    bus.emit(EventTypes.UI_TEXTS_UPDATE);
  }
  function init() {
    cache();
    cacheInputs();
    bindEventSubscriptions();
    attachEventHandlers();
    updateControlsState();
  }
  return {
    init,
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
function createVoices({ bus }) {
  let voices = [];
  let availableLanguages = [];
  const emitter = bus;
  function computeAvailableLanguages() {
    availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => ((v.lang || "").split(/[-_]/)[0] || "").toUpperCase())
          .filter(Boolean)
      )
    ).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.unshift("ALL");
  }
  function publish(evt) {
    const lightweight = voices.map((v) => ({ name: v.name, lang: v.lang }));
    emitter?.emit?.(evt, {
      voices: lightweight,
      availableLanguages: availableLanguages.slice(),
    });
  }
  function collect() {
    voices = speechSynthesis.getVoices() || [];
    computeAvailableLanguages();
    publish("voices:changed");
  }
  async function load() {
    collect();
    if (!voices.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await new Promise((r) => setTimeout(r, 250));
        collect();
      } catch (err) {
        console.warn("Voices.load fallback failed", err);
      }
    }
    publish("voices:loaded");
  }
  if ("onvoiceschanged" in speechSynthesis)
    speechSynthesis.onvoiceschanged = () => collect();
  return {
    collect,
    load,
    getVoices: () => voices.slice(),
    getAvailableLanguages: () => availableLanguages.slice(),
  };
}
function createPlayback({ bus, speaker, utils, wakeLock, uiProvider, config }) {
  let currentSettings = { pitch: 1.0, volume: 1.0 };
  let currentAppState = "init";
  let currentIndex = 0;
  function buildPlayQueue() {
    return uiProvider
      .getSelectedInputs()
      .map((i) => ({ value: i.value, el: i }));
  }
  function resetRuntime(runtime) {
    runtime.playQueue = [];
    runtime.repeatsRemaining = utils.safeNumber(currentSettings.repeat, 1);
    bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
  }
  async function playSequence(runtime) {
    if (currentAppState !== "playing") return;
    const delayMs = utils.safeNumber(currentSettings.delay, 500);
    while (currentAppState === "playing") {
      if (currentIndex >= runtime.playQueue.length) {
        if (runtime.repeatsRemaining > 1) {
          runtime.repeatsRemaining -= 1;
          bus.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
          currentIndex = 0;
          bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
        } else {
          bus.emit(EventTypes.APP_STATE_SET, "ready");
          bus.emit(EventTypes.UI_BACKGROUND_HIDE);
          bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
          resetRuntime(runtime);
          bus.emit(EventTypes.UI_HIGHLIGHT);
          wakeLock.release();
          bus.emit(EventTypes.PLAYBACK_FINISH);
          return;
        }
      }
      const idx = currentIndex;
      const item = runtime.playQueue[idx];
      if (!item || !item.value) {
        currentIndex = idx + 1;
        bus.emit(EventTypes.PLAYBACK_INDEX_SET, currentIndex);
        await utils.delay(delayMs);
        continue;
      }
      bus.emit(EventTypes.UI_HIGHLIGHT);
      bus.emit(EventTypes.UI_BACKGROUND_SHOW);
      bus.emit(EventTypes.UI_ACTIVE_NUMBER_SHOW, {
        value: item.value,
        delayMs,
      });
      await speaker.speakAsync(String(item.value), {
        languageCode: currentSettings.languageCode || "nl-NL",
        speed: currentSettings.speed,
        pitch: currentSettings.pitch,
        volume: currentSettings.volume,
        voiceName: currentSettings.voiceName,
      });
      if (currentAppState !== "playing") break;
      currentIndex = idx + 1;
      bus.emit(EventTypes.PLAYBACK_INDEX_SET, currentIndex);
      await utils.delay(delayMs);
    }
  }
  const runtime = { playQueue: [], repeatsRemaining: 1 };
  bus.on(EventTypes.PLAYBACK_START, () => {
    currentAppState = "playing";
    runtime.repeatsRemaining = utils.safeNumber(currentSettings.repeat, 1);
    bus.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
    runtime.playQueue = buildPlayQueue();
    currentIndex = 0;
    bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
    bus.emit(EventTypes.APP_STATE_SET, "playing");
    bus.emit(EventTypes.UI_BACKGROUND_SHOW);
    wakeLock.request().catch(() => {});
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });
  bus.on(EventTypes.PLAYBACK_RESUME, () => {
    currentAppState = "playing";
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });
  bus.on(EventTypes.PLAYBACK_PAUSE, () => {
    speaker.cancel();
    currentAppState = "paused";
    bus.emit(EventTypes.APP_STATE_SET, "paused");
    bus.emit(EventTypes.UI_BACKGROUND_HIDE);
    bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
  });
  bus.on(EventTypes.PLAYBACK_STOP, () => {
    speaker.cancel();
    currentAppState = "ready";
    bus.emit(EventTypes.APP_STATE_SET, "ready");
    bus.emit(EventTypes.UI_BACKGROUND_HIDE);
    bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
    resetRuntime(runtime);
    bus.emit(
      EventTypes.UI_REPEAT_LEFT_SET,
      utils.safeNumber(currentSettings.repeat, 1)
    );
    bus.emit(EventTypes.UI_HIGHLIGHT);
    wakeLock.release();
  });
  bus.on(EventTypes.PLAYBACK_TOGGLE, () => {
    if (currentAppState === "playing")
      return bus.emit(EventTypes.PLAYBACK_PAUSE);
    if (currentAppState === "paused")
      return bus.emit(EventTypes.PLAYBACK_RESUME);
    bus.emit(EventTypes.PLAYBACK_START);
  });
  bus.on(EventTypes.SETTINGS_CHANGED, (s) => (currentSettings = { ...s }));
  bus.on(EventTypes.APP_STATE, (s) => (currentAppState = s));
  bus.on(EventTypes.PLAYBACK_INDEX, (i) => (currentIndex = i));
  return { buildPlayQueue };
}
function createApp({
  bus,
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
  let currentSettings = defaultSettings();
  function setAppStateDirect(s) {
    bus.emit(EventTypes.APP_STATE_SET, s);
    bus.emit(EventTypes.APP_STATE, s);
  }
  async function init() {
    await config.load();
    await langLoader.loadAll();
    ui.init();
    await voices.load();
    const stored = store.loadSettings();
    if (stored) currentSettings = { ...currentSettings, ...stored };
    speaker.init(
      () => (voices.getVoices ? voices.getVoices() : []),
      () => (store.getSettings ? store.getSettings() : currentSettings)
    );
    store.resetSettings(currentSettings);
    speaker && speaker.speak;
    bus.emit(EventTypes.SETTINGS_CHANGED, currentSettings);
    setAppStateDirect("ready");
    wakeLock.init();
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        bus.emit(EventTypes.PLAYBACK_TOGGLE);
      }
    });
  }
  function resetToDefaultSettings() {
    const ds = defaultSettings();
    currentSettings = { ...ds };
    store.resetSettings(ds);
    bus.emit(EventTypes.SETTINGS_CHANGED, currentSettings);
  }
  function fullReset() {
    store.resetSettings(defaultSettings());
    store.loadSettings();
    bus.emit(EventTypes.APP_FULL_RESET);
  }
  return { init, resetToDefaultSettings, fullReset, setAppStateDirect };
}
(function bootstrap() {
  const bus = createEventBus();
  const Config = createConfig();
  const LangLoader = createLangLoader({ config: Config });
  const Store = createStore({ config: Config, bus: bus });
  const WakeLock = createWakeLock({ bus: bus });
  const Voices = createVoices({ bus: bus });
  const Speaker = createSpeaker({
    bus: bus,
    voicesProvider: () => Voices.getVoices(),
    settingsProvider: () => Store.getSettings(),
  });
  const UI = createUI({
    bus: bus,
    store: Store,
    config: Config,
    langLoader: LangLoader,
    utils: Utils,
  });
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
  App.init().catch((e) => console.warn("App init failed", e));
  window.__NLT_app = {
    bus,
    Config,
    LangLoader,
    Store,
    WakeLock,
    Voices,
    Speaker,
    UI,
    Playback,
    App,
  };
})();
