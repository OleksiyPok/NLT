"use strict";

/*
Utils
Interface:
  - safeNumber(v, defVal)
  - safeSetSelectValue(selectEl, val, fallback)
  - delay(ms)
  - isMobileDevice()
  - normalizeString(s)
*/
const Utils = (() => {
  function safeNumber(v, defVal) {
    const n = Number(v);
    return Number.isFinite(n) ? n : defVal;
  }
  function safeSetSelectValue(selectEl, val, fallback) {
    if (!selectEl) return fallback;
    const values = Array.from(selectEl.options).map((o) => o.value);
    const chosen = values.includes(val) ? val : fallback;
    if (selectEl.value !== chosen) selectEl.value = chosen;
    return chosen;
  }
  function delay(ms) {
    return new Promise((r) => setTimeout(r, Number(ms) || 0));
  }
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    );
  }
  function normalizeString(s) {
    return String(s || "")
      .trim()
      .toLowerCase();
  }
  return {
    safeNumber,
    safeSetSelectValue,
    delay,
    isMobileDevice,
    normalizeString,
  };
})();

/*
EventBus factory
Interface:
  - on(event, fn) => unsubscribe()
  - off(event, fn)
  - emit(event, payload)
*/
function createEventBus() {
  const listeners = new Map();
  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  }
  function off(event, fn) {
    listeners.get(event)?.delete(fn);
  }
  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (e) {
        console.warn("Event error", event, e);
      }
    }
  }
  return { on, off, emit };
}

/*
Config factory
Interface:
  - CONFIG property after load
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
      mobile: {
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
      desktop: {
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
    },
    ENUMS: {
      AppStates: {
        INIT: "init",
        READY: "ready",
        PLAYING: "playing",
        PAUSED: "paused",
      },
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
          if (ext.DEFAULT_SETTINGS?.mobile)
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.mobile,
              ext.DEFAULT_SETTINGS.mobile
            );
          if (ext.DEFAULT_SETTINGS?.desktop)
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.desktop,
              ext.DEFAULT_SETTINGS.desktop
            );
          if (typeof ext.DEVELOPER_MODE === "boolean")
            this.CONFIG.DEVELOPER_MODE = ext.DEVELOPER_MODE;
          if (typeof ext.USE_LOCAL_STORAGE === "boolean")
            this.CONFIG.USE_LOCAL_STORAGE = ext.USE_LOCAL_STORAGE;
          if (typeof ext.DEFAULT_VOICE === "string")
            this.CONFIG.DEFAULT_VOICE = ext.DEFAULT_VOICE;
        }
      } catch (e) {
        console.warn("Config load failed, using defaults", e);
      }
    },
  };
  return instance;
}

/*
LangLoader factory
Interface:
  - loadLang(code) => Promise<object|null>
  - loadAll() => Promise<texts>
  - getTexts(lang) => object
Needs:
  - config
*/
function createLangLoader({ config }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};
  async function loadLang(code) {
    const url = `${PATH}/${code}.json`;
    try {
      const res = await fetch(url, { cache: "no-cache" });
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
      texts.en = {
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
      console.warn("EN fallback injected (no file available).");
    }
    return texts;
  }
  function getTexts(lang) {
    return texts[lang] || texts.en;
  }
  return { loadLang, loadAll, getTexts };
}

/*
Store factory
Interface:
  - get() => state
  - saveSettings(), loadSettings(), removeSettings()
*/
function createStore({ config }) {
  const state = {
    appState: null,
    settings: { pitch: 1.0, volume: 1.0 },
    texts: {},
    voices: [],
    availableLanguages: [],
    inputs: [],
    playQueue: [],
    currentIndex: 0,
    repeatsRemaining: 1,
  };

  const Storage = {
    KEY: "NLT_settings",
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
      } catch (e) {}
    },
  };

  function get() {
    return state;
  }
  function saveSettings() {
    Storage.save(state.settings);
  }
  function loadSettings() {
    return Storage.load();
  }
  function removeSettings() {
    Storage.remove();
  }

  return { get, saveSettings, loadSettings, removeSettings };
}

/*
WakeLock factory
Interface:
  - init()
  - request()
  - release()
Needs:
  - storeProvider, config, events
*/
function createWakeLock({ storeProvider, config, events }) {
  const instance = {
    wakeLock: null,
    async request() {
      try {
        if ("wakeLock" in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          if (this.wakeLock?.addEventListener) {
            this.wakeLock.addEventListener("release", () =>
              console.log("Wake Lock released")
            );
          }
          console.log("Wake Lock acquired");
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
      } catch (e) {}
      this.wakeLock = null;
    },
    init() {
      document.addEventListener("visibilitychange", () => {
        const { appState } = storeProvider();
        if (document.visibilityState === "visible") {
          if (appState === config.CONFIG.ENUMS.AppStates.PLAYING)
            this.request();
        } else {
          this.release();
        }
      });
      if (events) {
        events.on("app:state", (s) => {
          if (s === config.CONFIG.ENUMS.AppStates.PLAYING) this.request();
          else this.release();
        });
      }
    },
  };
  return instance;
}

/*
Speaker factory
Interface:
  - init(voicesProvider, settingsProvider)
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

    const utter = new SpeechSynthesisUtterance(text);
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
UI factory
Interface:
  - cache(), cacheInputs(), setSelectsFromSettings(s), populateLanguageSelect(),
    populateVoiceSelect(), setLanguageCodeFromSettings(), setVoiceFromSettings(),
    updateUILabels(), updateStartPauseButton(), updateControlsState(),
    showBackgroundOverlay(), hideBackgroundOverlay(), showActiveNumberOverlay(value, delayMs),
    hideActiveNumberOverlay(), updateSettingsFromUI(), attachEventHandlers(),
    bindEventSubscriptions(), resetRepeatLeft(), fillRandom(), highlightSelection(), elements
Needs:
  - events, storeProvider, utils, config
*/
function createUI({ events, storeProvider, utils, config }) {
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

  function cache() {
    for (const key in SELECTORS) {
      elements[key] = document.querySelector(SELECTORS[key]) || null;
    }
  }

  function cacheInputs() {
    const st = storeProvider();
    if (elements.numberGrid) {
      st.inputs = Array.from(
        elements.numberGrid.querySelectorAll("input[type='text']")
      );
      inputsCache = st.inputs;
    } else {
      inputsCache = [];
      storeProvider().inputs = [];
    }
  }

  function getInputs() {
    return inputsCache;
  }

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
    const st = storeProvider();
    const el = elements.languageCodeSelect;
    if (!el) return;
    const frag = document.createDocumentFragment();
    st.availableLanguages.forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      frag.appendChild(opt);
    });
    el.replaceChildren(frag);
    const configLang = (
      (st.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    el.value = st.availableLanguages.includes(configLang)
      ? configLang
      : utils.isMobileDevice()
      ? "ALL"
      : el.value;
  }

  function populateVoiceSelect() {
    const st = storeProvider();
    const el = elements.voiceSelect;
    if (!el || !st.voices.length) return;
    const isMobile = utils.isMobileDevice();
    const selectedLang = (
      elements.languageCodeSelect?.value || "ALL"
    ).toUpperCase();
    const voicesToShow =
      isMobile || selectedLang === "ALL"
        ? st.voices
        : st.voices.filter((v) =>
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
    const requestedVoice = utils.normalizeString(st.settings.voiceName || "");
    const requestedLang = utils.normalizeString(st.settings.languageCode || "");
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
    st.settings.voiceName = el.value;
  }

  function setLanguageCodeFromSettings() {
    const st = storeProvider();
    const E = elements;
    const langPart = (
      (st.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    if (E.languageCodeSelect && E.languageCodeSelect.value !== langPart) {
      E.languageCodeSelect.value = langPart;
    }
  }

  function setVoiceFromSettings() {
    const st = storeProvider();
    const E = elements;
    const voice = st.settings.voiceName;
    if (!E.voiceSelect || !voice) return;
    const opts = Array.from(E.voiceSelect.options).map((o) => o.value);
    if (opts.includes(voice) && E.voiceSelect.value !== voice) {
      E.voiceSelect.value = voice;
    }
  }

  function updateUILabels() {
    const st = storeProvider();
    const uiLang = elements.uiLangSelect?.value || "en";
    const texts = st.texts[uiLang] || st.texts.en;
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
    const st = storeProvider();
    const uiLang = elements.uiLangSelect?.value || "en";
    const texts = st.texts[uiLang] || st.texts.en;
    if (!texts) return;
    const labels = {
      [config.CONFIG.ENUMS.AppStates.PLAYING]: texts.pause,
      [config.CONFIG.ENUMS.AppStates.PAUSED]: texts.continue,
      [config.CONFIG.ENUMS.AppStates.READY]: texts.start,
    };
    const btn = elements.startPauseBtn;
    if (btn) {
      const val = labels[st.appState] || texts.start;
      if (btn.textContent !== val) btn.textContent = val;
    }
  }

  function updateControlsState() {
    const st = storeProvider();
    const isPlaying = st.appState === config.CONFIG.ENUMS.AppStates.PLAYING;
    const isPaused = st.appState === config.CONFIG.ENUMS.AppStates.PAUSED;
    const isReady = st.appState === config.CONFIG.ENUMS.AppStates.READY;

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
    const overlay = elements.backgroundOverlay;
    if (!overlay) return;
    overlay.classList.add("show");
  }
  function hideBackgroundOverlay() {
    const overlay = elements.backgroundOverlay;
    if (!overlay) return;
    overlay.classList.remove("show");
  }
  function showActiveNumberOverlay(value, delayMs) {
    if ((elements.fullscreenSelect?.value || "0") !== "1") return;
    const overlay = elements.activeNumberOverlay;
    if (!overlay) return;
    if (overlay.textContent !== value) overlay.textContent = value || "";
    overlay.classList.add("show");
    setTimeout(() => {
      overlay.classList.remove("show");
    }, 1000 + Number(delayMs || 0));
  }
  function hideActiveNumberOverlay() {
    const overlay = elements.activeNumberOverlay;
    if (!overlay) return;
    overlay.classList.remove("show");
  }

  function updateSettingsFromUI() {
    const st = storeProvider();
    const E = elements;
    const s = st.settings;
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
    // save via Store object (not via state)
    Store.saveSettings();
    events.emit("settings:changed", structuredClone(s));
  }

  function attachEventHandlers() {
    const E = elements;

    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      updateSettingsFromUI();
    });
    if (!utils.isMobileDevice())
      E.languageCodeSelect?.addEventListener("change", () => {
        populateVoiceSelect();
        updateSettingsFromUI();
      });
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
      events.emit("app:settings:resetToDefault")
    );
    E.startPauseBtn?.addEventListener("click", () =>
      events.emit("playback:toggle")
    );
    E.resetBtn?.addEventListener("click", () => events.emit("app:fullReset"));
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
    const st = storeProvider();
    const maxValue = 10 ** utils.safeNumber(st.settings.digitLength, 2) - 1;
    st.inputs.forEach((input) => {
      input.value = String(Math.floor(Math.random() * (maxValue + 1)));
    });
  }

  function highlightSelection() {
    const st = storeProvider();
    const count = Number(st.settings.count || 0);
    const ci = st.currentIndex;
    st.inputs.forEach((input, idx) => {
      const sel = idx < count;
      const hi = idx === ci;
      if (input.classList.contains("selected") !== sel)
        input.classList.toggle("selected", sel);
      if (input.classList.contains("highlight") !== hi)
        input.classList.toggle("highlight", hi);
    });
  }

  function bindEventSubscriptions() {
    events.on("ui:background:show", showBackgroundOverlay);
    events.on("ui:background:hide", hideBackgroundOverlay);
    events.on("ui:activeNumber:show", ({ value, delayMs }) =>
      showActiveNumberOverlay(value, delayMs)
    );
    events.on("ui:activeNumber:hide", hideActiveNumberOverlay);
    events.on("ui:highlight", highlightSelection);
    events.on("ui:repeatLeft:set", (val) => {
      if (
        elements.repeatLeft &&
        String(elements.repeatLeft.textContent) !== String(val)
      ) {
        elements.repeatLeft.textContent = String(val);
      }
      updateControlsState();
    });
    events.on("app:state", () => {
      updateStartPauseButton();
      updateControlsState();
    });
    events.on("ui:texts:update", updateUILabels);
  }

  return {
    cache,
    cacheInputs,
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
Voices factory
Interface:
  - collect()
  - load()
Needs:
  - events, storeProvider, utils
*/
function createVoices({ events, storeProvider, utils }) {
  function collect() {
    const voices = speechSynthesis.getVoices() || [];
    storeProvider().voices = voices;
    storeProvider().availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => (v.lang || "").split("-")[0].toUpperCase())
          .filter(Boolean)
      )
    )
      .sort()
      .concat([]);
    if (!storeProvider().availableLanguages.includes("ALL"))
      storeProvider().availableLanguages.push("ALL");

    const lightweight = voices.map((v) => ({ name: v.name, lang: v.lang }));
    events.emit("voices:changed", {
      voices: lightweight,
      availableLanguages: storeProvider().availableLanguages.slice(),
    });
  }

  async function load() {
    collect();
    const vs = storeProvider().voices;
    if (!vs.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await Utils.delay(250);
        collect();
      } catch (err) {
        console.warn("Voices.load fallback failed", err);
      }
    }
    const lightweight = storeProvider().voices.map((v) => ({
      name: v.name,
      lang: v.lang,
    }));
    events.emit("voices:loaded", {
      voices: lightweight,
      availableLanguages: storeProvider().availableLanguages.slice(),
    });
  }

  if ("onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      collect();
      const lightweight = storeProvider().voices.map((v) => ({
        name: v.name,
        lang: v.lang,
      }));
      events.emit("voices:changed", {
        voices: lightweight,
        availableLanguages: storeProvider().availableLanguages.slice(),
      });
    };
  }

  return { collect, load };
}

/*
Playback factory
Interface:
  - buildPlayQueue()
Needs:
  - events, storeProvider, speaker, utils, wakeLock, config
*/
function createPlayback({
  events,
  storeProvider,
  speaker,
  utils,
  wakeLock,
  config,
}) {
  function buildPlayQueue() {
    const st = storeProvider();
    st.playQueue = st.inputs.filter((i) => i.classList.contains("selected"));
  }

  function resetRuntime() {
    const st = storeProvider();
    st.currentIndex = 0;
    st.playQueue = [];
    st.repeatsRemaining = utils.safeNumber(st.settings.repeat, 1);
  }

  async function playSequence() {
    const st = storeProvider();
    if (st.appState !== config.CONFIG.ENUMS.AppStates.PLAYING) return;
    const delayMs = utils.safeNumber(st.settings.delay, 500);

    while (storeProvider().appState === config.CONFIG.ENUMS.AppStates.PLAYING) {
      const stNow = storeProvider();

      if (stNow.currentIndex >= stNow.playQueue.length) {
        if (stNow.repeatsRemaining > 1) {
          stNow.repeatsRemaining -= 1;
          events.emit("ui:repeatLeft:set", stNow.repeatsRemaining);
          stNow.currentIndex = 0;
        } else {
          events.emit("app:state:set", config.CONFIG.ENUMS.AppStates.READY);
          events.emit("ui:background:hide");
          events.emit("ui:activeNumber:hide");
          resetRuntime();
          events.emit("ui:highlight");
          wakeLock.release();
          return;
        }
      }

      const input = stNow.playQueue[stNow.currentIndex];
      if (!input || !input.value) {
        stNow.currentIndex += 1;
        await utils.delay(delayMs);
        continue;
      }

      events.emit("ui:highlight");
      events.emit("ui:background:show");
      events.emit("ui:activeNumber:show", { value: input.value, delayMs });

      await speaker.speak(input.value, {
        languageCode: stNow.settings.languageCode || "nl-NL",
        speed: stNow.settings.speed,
        pitch: stNow.settings.pitch,
        volume: stNow.settings.volume,
        voiceName: stNow.settings.voiceName,
      });

      if (storeProvider().appState !== config.CONFIG.ENUMS.AppStates.PLAYING)
        break;
      storeProvider().currentIndex += 1;
      await utils.delay(delayMs);
    }
  }

  events.on("playback:start", () => {
    const st = storeProvider();
    st.repeatsRemaining = utils.safeNumber(st.settings.repeat, 1);
    events.emit("ui:repeatLeft:set", st.repeatsRemaining);
    buildPlayQueue();
    st.currentIndex = 0;
    events.emit("app:state:set", config.CONFIG.ENUMS.AppStates.PLAYING);
    events.emit("ui:background:show");
    playSequence().catch((e) => console.warn("playSequence failed", e));
  });

  events.on("playback:resume", () => {
    events.emit("app:state:set", config.CONFIG.ENUMS.AppStates.PLAYING);
    playSequence().catch((e) => console.warn("playSequence failed", e));
  });

  events.on("playback:pause", () => {
    speaker.cancel();
    events.emit("app:state:set", config.CONFIG.ENUMS.AppStates.PAUSED);
    events.emit("ui:background:hide");
    events.emit("ui:activeNumber:hide");
  });

  events.on("playback:stop", () => {
    speaker.cancel();
    events.emit("app:state:set", config.CONFIG.ENUMS.AppStates.READY);
    events.emit("ui:background:hide");
    events.emit("ui:activeNumber:hide");
    resetRuntime();
    events.emit(
      "ui:repeatLeft:set",
      utils.safeNumber(storeProvider().settings.repeat, 1)
    );
    events.emit("ui:highlight");
    wakeLock.release();
  });

  events.on("playback:toggle", () => {
    const st = storeProvider();
    if (st.appState === config.CONFIG.ENUMS.AppStates.PLAYING) {
      events.emit("playback:pause");
      return;
    }
    if (st.appState === config.CONFIG.ENUMS.AppStates.PAUSED) {
      events.emit("playback:resume");
      return;
    }
    events.emit("playback:start");
  });

  return { buildPlayQueue };
}

/*
App factory
Interface:
  - init()
Needs:
  - events, config, langLoader, store, ui, voices, speaker, wakeLock, playback, utils
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
  playback,
  utils,
}) {
  function loadUILangs() {
    const st = store.get();
    return langLoader.loadAll().then((texts) => {
      st.texts = texts;
      events.emit("ui:texts:update");
    });
  }

  function getDefaultSettings() {
    const type = utils.isMobileDevice() ? "mobile" : "desktop";
    return {
      ...(config.DEFAULT_CONFIG.DEFAULT_SETTINGS[type]
        ? config.DEFAULT_CONFIG.DEFAULT_SETTINGS[type]
        : config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop),
    };
  }

  function setAppStateDirect(s) {
    const st = store.get();
    st.appState = s;
    events.emit("app:state", s);
    if (s === config.CONFIG.ENUMS.AppStates.PLAYING) {
      wakeLock.request();
    } else {
      wakeLock.release();
    }
  }

  function resetToDefaultSettings() {
    const st = store.get();
    store.removeSettings();
    speaker.cancel();
    events.emit("playback:stop");
    st.settings = getDefaultSettings();
    ui.setSelectsFromSettings(st.settings);
    if (ui.elements.languageCodeSelect) {
      ui.populateLanguageSelect();
      ui.setLanguageCodeFromSettings();
      setTimeout(() => ui.populateVoiceSelect(), 0);
    }
    if (ui.elements.voiceSelect) ui.setVoiceFromSettings();
    store.saveSettings();
    ui.updateUILabels();
    ui.fillRandom();
    ui.highlightSelection();
    ui.resetRepeatLeft();
  }

  function fullReset() {
    speaker.cancel();
    events.emit("playback:stop");
  }

  function handleKeyControls(event) {
    const tag = document.activeElement?.tagName || "";
    const isTyping = ["INPUT", "TEXTAREA"].includes(tag);
    if (
      event.key === "Escape" ||
      event.key === "Esc" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      event.preventDefault();
      events.emit("app:fullReset");
    }
    if (
      (event.key === " " ||
        event.key === "Spacebar" ||
        event.code === "Space" ||
        event.keyCode === 32) &&
      !isTyping
    ) {
      event.preventDefault();
      events.emit("playback:toggle");
    }
  }

  async function handleDOMContentLoaded() {
    ui.bindEventSubscriptions();
    ui.cache();
    await config.load();
    const st = store.get();
    const initial = config.CONFIG?.USE_LOCAL_STORAGE
      ? store.loadSettings()
      : null;
    st.settings =
      initial ||
      (config.CONFIG
        ? {
            ...config.CONFIG.DEFAULT_SETTINGS[
              utils.isMobileDevice() ? "mobile" : "desktop"
            ],
          }
        : getDefaultSettings());
    ui.setSelectsFromSettings(st.settings);
    await loadUILangs();
    if (ui.elements.uiLangSelect) {
      const chosen = ui.elements.uiLangSelect.value || "en";
      if (!st.texts[chosen]) {
        ui.elements.uiLangSelect.value = "en";
        st.settings.uiLang = "en";
      }
    }
    ui.updateUILabels();
    setAppStateDirect(config.CONFIG.ENUMS.AppStates.READY);
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
      events.emit("app:fullReset")
    );
    if (ui.elements.startPauseBtn) ui.elements.startPauseBtn.disabled = false;
    ui.resetRepeatLeft();
    document.addEventListener("keydown", handleKeyControls);
    if (ui.elements.developerPanel) {
      ui.elements.developerPanel.style.display = config.CONFIG.DEVELOPER_MODE
        ? "flex"
        : "none";
    }
    store.saveSettings();
    speaker.init(
      () => store.get().voices,
      () => store.get().settings
    );
    wakeLock.init();
  }

  function bindEventSubscriptions() {
    events.on("app:state:set", (s) => setAppStateDirect(s));
    events.on("app:settings:resetToDefault", resetToDefaultSettings);
    events.on("app:fullReset", fullReset);
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

/* =========================
   Wire together with DI in one file
   ========================= */

const Events = createEventBus();
const Config = createConfig();
const LangLoader = createLangLoader({ config: Config });
const Store = createStore({ config: Config });
const WakeLock = createWakeLock({
  storeProvider: Store.get,
  config: Config,
  events: Events,
});
const Speaker = createSpeaker();
const UI = createUI({
  events: Events,
  storeProvider: Store.get,
  utils: Utils,
  config: Config,
});
const Voices = createVoices({
  events: Events,
  storeProvider: Store.get,
  utils: Utils,
});
const Playback = createPlayback({
  events: Events,
  storeProvider: Store.get,
  speaker: Speaker,
  utils: Utils,
  wakeLock: WakeLock,
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
  playback: Playback,
  utils: Utils,
});

/* minimal cross-cutting subscription */
Events.on("settings:changed", () => {});

App.init();
