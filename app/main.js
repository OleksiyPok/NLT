"use strict";

/* ===========================
 * Utils
 * Interface: safeNumber(v, defVal), safeSetSelectValue(selectEl, val, fallback), delay(ms), isMobileDevice(), normalizeString(s)
 * =========================== */
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

/* ===========================
 * EventBus
 * Interface: on(event, fn), off(event, fn), emit(event, payload)
 * =========================== */
const Events = (() => {
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
})();

/* ===========================
 * Config
 * Interface: CONFIG (after load), load()
 * =========================== */
const Config = {
  PATHS: {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
  },
  UI_LANGS: Object.freeze([
    "de",
    "en",
    "fr",
    "nl",
    "pl",
    "pt",
    "ru",
    "tr",
    "uk",
  ]),
  DEFAULT_CONFIG: Object.freeze({
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
  }),
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

/* ===========================
 * LangLoader
 * Interface: loadLang(code): Promise<object|null>, loadAll(), getTexts(lang)
 * =========================== */
const LangLoader = (() => {
  const PATH = "./assets/locales";
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
      Config.UI_LANGS.map(async (code) => {
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
})();

/* ===========================
 * Store (single object but mirrors original structure)
 * Interface:
 *   - get(): state object (appState, settings, texts, voices, availableLanguages, inputs, playQueue, currentIndex, repeatsRemaining)
 *   - saveSettings(), loadSettings(), removeSettings()
 * Behavior: keeps live SpeechSynthesisVoice objects in state.voices (like original)
 * =========================== */
const Store = (() => {
  const state = {
    appState: null,
    settings: { pitch: 1.0, volume: 1.0 },
    texts: {},
    voices: [], // live SpeechSynthesisVoice objects
    availableLanguages: [],
    inputs: [],
    playQueue: [],
    currentIndex: 0,
    repeatsRemaining: 1,
  };

  const Storage = {
    KEY: "NLT_settings",
    save(settings) {
      if (!Config.CONFIG?.USE_LOCAL_STORAGE) return;
      try {
        localStorage.setItem(this.KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn("LS save failed", e);
      }
    },
    load() {
      if (!Config.CONFIG?.USE_LOCAL_STORAGE) return null;
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
})();

/* ===========================
 * WakeLock
 * Interface: request(), release(), init()
 * =========================== */
const WakeLock = {
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
      const { appState } = Store.get();
      if (document.visibilityState === "visible") {
        if (appState === Config.CONFIG.ENUMS.AppStates.PLAYING) this.request();
      } else {
        this.release();
      }
    });
  },
};

/* ===========================
 * Speaker
 * Interface: init(voicesProvider, settingsProvider), speak(text, options?), cancel(), pause(), resume(), isSpeaking(), isPaused()
 * Note: Speaker uses live SpeechSynthesisVoice objects from voicesProvider()
 * =========================== */
const Speaker = (() => {
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
})();

/* ===========================
 * UI (renderer + controller)
 * Renderer Interface: cache(), cacheInputs(), getInputs(), setSelectsFromSettings(s), populateLanguageSelect(langs), populateVoiceSelect(voices, settings), setLanguageCodeFromSettings(settings), setVoiceFromSettings(settings), updateUILabels(texts), updateStartPauseButton(appState, texts), updateControlsState(appState), showBackgroundOverlay(), hideBackgroundOverlay(), showActiveNumberOverlay(value, delayMs), hideActiveNumberOverlay(), attachEventHandlers()
 * Controller: binds events and orchestrates
 * Emits actions via Events (playback:toggle, app:settings:resetToDefault, app:fullReset). Uses Store directly for reads/writes (like original).
 * =========================== */
const UI = (() => {
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
    const st = Store.get();
    if (elements.numberGrid) {
      st.inputs = Array.from(
        elements.numberGrid.querySelectorAll("input[type='text']")
      );
      inputsCache = st.inputs;
    } else {
      inputsCache = [];
      Store.get().inputs = [];
    }
  }

  function getInputs() {
    return inputsCache;
  }

  function setSelectsFromSettings(s) {
    const E = elements;
    s.digitLength = Utils.safeNumber(
      Utils.safeSetSelectValue(E.digitLengthSelect, String(s.digitLength), "2"),
      2
    );
    s.count = Utils.safeNumber(
      Utils.safeSetSelectValue(E.countSelect, String(s.count), "40"),
      40
    );
    s.repeat = Utils.safeNumber(
      Utils.safeSetSelectValue(E.repeatSelect, String(s.repeat), "1"),
      1
    );
    s.speed = Utils.safeNumber(
      Utils.safeSetSelectValue(
        E.speedSelect,
        Number(s.speed).toFixed(1),
        "1.0"
      ),
      1.0
    );
    s.delay = Utils.safeNumber(
      Utils.safeSetSelectValue(E.delaySelect, String(s.delay), "1000"),
      1000
    );
    s.fullscreen = Utils.safeSetSelectValue(
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
    const st = Store.get();
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
      : Utils.isMobileDevice()
      ? "ALL"
      : el.value;
  }

  function populateVoiceSelect() {
    const st = Store.get();
    const el = elements.voiceSelect;
    if (!el || !st.voices.length) return;
    const isMobile = Utils.isMobileDevice();
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
    const requestedVoice = Utils.normalizeString(st.settings.voiceName || "");
    const requestedLang = Utils.normalizeString(st.settings.languageCode || "");
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
    st.settings.voiceName = el.value;
  }

  function setLanguageCodeFromSettings() {
    const st = Store.get();
    const E = elements;
    const langPart = (
      (st.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL"
    ).toUpperCase();
    if (E.languageCodeSelect && E.languageCodeSelect.value !== langPart) {
      E.languageCodeSelect.value = langPart;
    }
  }

  function setVoiceFromSettings() {
    const st = Store.get();
    const E = elements;
    const voice = st.settings.voiceName;
    if (!E.voiceSelect || !voice) return;
    const opts = Array.from(E.voiceSelect.options).map((o) => o.value);
    if (opts.includes(voice) && E.voiceSelect.value !== voice) {
      E.voiceSelect.value = voice;
    }
  }

  function updateUILabels() {
    const st = Store.get();
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
    const st = Store.get();
    const uiLang = elements.uiLangSelect?.value || "en";
    const texts = st.texts[uiLang] || st.texts.en;
    if (!texts) return;
    const labels = {
      [Config.CONFIG.ENUMS.AppStates.PLAYING]: texts.pause,
      [Config.CONFIG.ENUMS.AppStates.PAUSED]: texts.continue,
      [Config.CONFIG.ENUMS.AppStates.READY]: texts.start,
    };
    const btn = elements.startPauseBtn;
    if (btn) {
      const val = labels[st.appState] || texts.start;
      if (btn.textContent !== val) btn.textContent = val;
    }
  }

  function updateControlsState() {
    const st = Store.get();
    const isPlaying = st.appState === Config.CONFIG.ENUMS.AppStates.PLAYING;
    const isPaused = st.appState === Config.CONFIG.ENUMS.AppStates.PAUSED;
    const isReady = st.appState === Config.CONFIG.ENUMS.AppStates.READY;

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
    const st = Store.get();
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
    Store.saveSettings();
    Events.emit("settings:changed", structuredClone(s));
  }

  function attachEventHandlers() {
    const E = elements;

    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      updateSettingsFromUI();
    });
    if (!Utils.isMobileDevice())
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
      Events.emit("app:settings:resetToDefault")
    );
    E.startPauseBtn?.addEventListener("click", () =>
      Events.emit("playback:toggle")
    );
    E.resetBtn?.addEventListener("click", () => Events.emit("app:fullReset"));
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
    const st = Store.get();
    const maxValue = 10 ** Utils.safeNumber(st.settings.digitLength, 2) - 1;
    st.inputs.forEach((input) => {
      input.value = String(Math.floor(Math.random() * (maxValue + 1)));
    });
  }

  function highlightSelection() {
    const st = Store.get();
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
    Events.on("ui:background:show", showBackgroundOverlay);
    Events.on("ui:background:hide", hideBackgroundOverlay);
    Events.on("ui:activeNumber:show", ({ value, delayMs }) =>
      showActiveNumberOverlay(value, delayMs)
    );
    Events.on("ui:activeNumber:hide", hideActiveNumberOverlay);
    Events.on("ui:highlight", highlightSelection);
    Events.on("ui:repeatLeft:set", (val) => {
      if (
        elements.repeatLeft &&
        String(elements.repeatLeft.textContent) !== String(val)
      ) {
        elements.repeatLeft.textContent = String(val);
      }
      updateControlsState();
    });
    Events.on("app:state", () => {
      updateStartPauseButton();
      updateControlsState();
    });
    Events.on("ui:texts:update", updateUILabels);
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
})();

/* ===========================
 * Voices module
 * Interface: collect(), load()
 * Behavior: stores live SpeechSynthesisVoice objects in Store.get().voices (like original),
 * but emits only plain arrays of {name, lang} and languages via Events to avoid cloning live objects.
 * Emits: voices:changed (payload contains lightweight voices list and languages), voices:loaded
 * =========================== */
const Voices = (() => {
  function collect() {
    const voices = speechSynthesis.getVoices() || [];
    Store.get().voices = voices; // live objects kept in Store (same as original)
    Store.get().availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => (v.lang || "").split("-")[0].toUpperCase())
          .filter(Boolean)
      )
    )
      .sort()
      .concat([]);
    if (!Store.get().availableLanguages.includes("ALL"))
      Store.get().availableLanguages.push("ALL");

    // emit only lightweight info
    const lightweight = voices.map((v) => ({ name: v.name, lang: v.lang }));
    Events.emit("voices:changed", {
      voices: lightweight,
      availableLanguages: Store.get().availableLanguages.slice(),
    });
  }

  async function load() {
    collect();
    const vs = Store.get().voices;
    if (!vs.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await Utils.delay(250);
        collect();
      } catch (err) {
        console.warn("Voices.load fallback failed", err);
      }
    }
    const lightweight = Store.get().voices.map((v) => ({
      name: v.name,
      lang: v.lang,
    }));
    Events.emit("voices:loaded", {
      voices: lightweight,
      availableLanguages: Store.get().availableLanguages.slice(),
    });
  }

  if ("onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      collect();
      // again emit lightweight list
      const lightweight = Store.get().voices.map((v) => ({
        name: v.name,
        lang: v.lang,
      }));
      Events.emit("voices:changed", {
        voices: lightweight,
        availableLanguages: Store.get().availableLanguages.slice(),
      });
    };
  }

  return { collect, load };
})();

/* ===========================
 * Playback module
 * Interface: buildPlayQueue()
 * Listens: playback:start/resume/pause/stop/toggle
 * Emits: app:state:set, ui:highlight, ui:background:show/hide, ui:activeNumber:show/hide, ui:repeatLeft:set
 * Behavior mirrors original logic but uses Speaker DI and Events for coordination.
 * =========================== */
const Playback = (() => {
  function buildPlayQueue() {
    const st = Store.get();
    st.playQueue = st.inputs.filter((i) => i.classList.contains("selected"));
  }

  function resetRuntime() {
    const st = Store.get();
    st.currentIndex = 0;
    st.playQueue = [];
    st.repeatsRemaining = Utils.safeNumber(st.settings.repeat, 1);
  }

  async function playSequence() {
    const st = Store.get();
    if (st.appState !== Config.CONFIG.ENUMS.AppStates.PLAYING) return;
    const delayMs = Utils.safeNumber(st.settings.delay, 500);

    while (Store.get().appState === Config.CONFIG.ENUMS.AppStates.PLAYING) {
      const stNow = Store.get();

      if (stNow.currentIndex >= stNow.playQueue.length) {
        if (stNow.repeatsRemaining > 1) {
          stNow.repeatsRemaining -= 1;
          Events.emit("ui:repeatLeft:set", stNow.repeatsRemaining);
          stNow.currentIndex = 0;
        } else {
          Events.emit("app:state:set", Config.CONFIG.ENUMS.AppStates.READY);
          Events.emit("ui:background:hide");
          Events.emit("ui:activeNumber:hide");
          resetRuntime();
          Events.emit("ui:highlight");
          WakeLock.release();
          return;
        }
      }

      const input = stNow.playQueue[stNow.currentIndex];
      if (!input || !input.value) {
        stNow.currentIndex += 1;
        await Utils.delay(delayMs);
        continue;
      }

      Events.emit("ui:highlight");
      Events.emit("ui:background:show");
      Events.emit("ui:activeNumber:show", { value: input.value, delayMs });

      await Speaker.speak(input.value, {
        languageCode: stNow.settings.languageCode || "nl-NL",
        speed: stNow.settings.speed,
        pitch: stNow.settings.pitch,
        volume: stNow.settings.volume,
        voiceName: stNow.settings.voiceName,
      });

      if (Store.get().appState !== Config.CONFIG.ENUMS.AppStates.PLAYING) break;
      Store.get().currentIndex += 1;
      await Utils.delay(delayMs);
    }
  }

  // event handlers
  Events.on("playback:start", () => {
    const st = Store.get();
    st.repeatsRemaining = Utils.safeNumber(st.settings.repeat, 1);
    Events.emit("ui:repeatLeft:set", st.repeatsRemaining);
    buildPlayQueue();
    st.currentIndex = 0;
    Events.emit("app:state:set", Config.CONFIG.ENUMS.AppStates.PLAYING);
    Events.emit("ui:background:show");
    playSequence().catch((e) => console.warn("playSequence failed", e));
  });

  Events.on("playback:resume", () => {
    Events.emit("app:state:set", Config.CONFIG.ENUMS.AppStates.PLAYING);
    playSequence().catch((e) => console.warn("playSequence failed", e));
  });

  Events.on("playback:pause", () => {
    Speaker.cancel();
    Events.emit("app:state:set", Config.CONFIG.ENUMS.AppStates.PAUSED);
    Events.emit("ui:background:hide");
    Events.emit("ui:activeNumber:hide");
  });

  Events.on("playback:stop", () => {
    Speaker.cancel();
    Events.emit("app:state:set", Config.CONFIG.ENUMS.AppStates.READY);
    Events.emit("ui:background:hide");
    Events.emit("ui:activeNumber:hide");
    resetRuntime();
    Events.emit(
      "ui:repeatLeft:set",
      Utils.safeNumber(Store.get().settings.repeat, 1)
    );
    Events.emit("ui:highlight");
    WakeLock.release();
  });

  Events.on("playback:toggle", () => {
    const st = Store.get();
    if (st.appState === Config.CONFIG.ENUMS.AppStates.PLAYING) {
      Events.emit("playback:pause");
      return;
    }
    if (st.appState === Config.CONFIG.ENUMS.AppStates.PAUSED) {
      Events.emit("playback:resume");
      return;
    }
    Events.emit("playback:start");
  });

  return { buildPlayQueue };
})();

/* ===========================
 * App
 * Interface: init()
 * Wiring: App listens for "app:state:set" and updates Store.get().appState WITHOUT re-emitting "app:state:set" to avoid recursion.
 * =========================== */
const App = (() => {
  function loadUILangs() {
    const st = Store.get();
    return LangLoader.loadAll().then((texts) => {
      st.texts = texts;
      Events.emit("ui:texts:update");
    });
  }

  function getDefaultSettings() {
    const type = Utils.isMobileDevice() ? "mobile" : "desktop";
    return {
      ...(Config.DEFAULT_CONFIG.DEFAULT_SETTINGS[type]
        ? Config.DEFAULT_CONFIG.DEFAULT_SETTINGS[type]
        : Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop),
    };
  }

  function setAppStateDirect(s) {
    // Set appState and emit single 'app:state' event (do NOT emit 'app:state:set' from here).
    const st = Store.get();
    st.appState = s;
    Events.emit("app:state", s);
    if (s === Config.CONFIG.ENUMS.AppStates.PLAYING) {
      WakeLock.request();
    } else {
      WakeLock.release();
    }
  }

  function resetToDefaultSettings() {
    const st = Store.get();
    Store.removeSettings();
    Speaker.cancel();
    Events.emit("playback:stop");
    st.settings = getDefaultSettings();
    UI.setSelectsFromSettings(st.settings);
    if (UI.elements.languageCodeSelect) {
      UI.populateLanguageSelect();
      UI.setLanguageCodeFromSettings();
      // small delay to allow DOM updates before populating voices
      setTimeout(() => UI.populateVoiceSelect(), 0);
    }
    if (UI.elements.voiceSelect) UI.setVoiceFromSettings();
    Store.saveSettings();
    UI.updateUILabels();
    UI.fillRandom();
    UI.highlightSelection();
    UI.resetRepeatLeft();
  }

  function fullReset() {
    Speaker.cancel();
    Events.emit("playback:stop");
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
      Events.emit("app:fullReset");
    }
    if (
      (event.key === " " ||
        event.key === "Spacebar" ||
        event.code === "Space" ||
        event.keyCode === 32) &&
      !isTyping
    ) {
      event.preventDefault();
      Events.emit("playback:toggle");
    }
  }

  async function handleDOMContentLoaded() {
    UI.bindEventSubscriptions();
    UI.cache();
    await Config.load();
    const st = Store.get();
    const initial = Config.CONFIG?.USE_LOCAL_STORAGE
      ? Store.loadSettings()
      : null;
    st.settings =
      initial ||
      (Config.CONFIG
        ? {
            ...Config.CONFIG.DEFAULT_SETTINGS[
              Utils.isMobileDevice() ? "mobile" : "desktop"
            ],
          }
        : getDefaultSettings());
    UI.setSelectsFromSettings(st.settings);
    await loadUILangs();
    if (UI.elements.uiLangSelect) {
      const chosen = UI.elements.uiLangSelect.value || "en";
      if (!st.texts[chosen]) {
        UI.elements.uiLangSelect.value = "en";
        st.settings.uiLang = "en";
      }
    }
    UI.updateUILabels();
    setAppStateDirect(Config.CONFIG.ENUMS.AppStates.READY);
    UI.hideBackgroundOverlay();
    await Voices.load();
    if (Utils.isMobileDevice()) {
      [UI.elements.languageCodeSelect, UI.elements.labelLanguageCode].forEach(
        (el) => el && (el.style.display = "none")
      );
    }
    UI.cacheInputs();
    UI.populateLanguageSelect();
    UI.setLanguageCodeFromSettings();
    UI.populateVoiceSelect();
    UI.setVoiceFromSettings();
    UI.fillRandom();
    UI.highlightSelection();
    UI.attachEventHandlers();
    UI.elements.resetBtn?.addEventListener("click", () =>
      Events.emit("app:fullReset")
    );
    if (UI.elements.startPauseBtn) UI.elements.startPauseBtn.disabled = false;
    UI.resetRepeatLeft();
    document.addEventListener("keydown", handleKeyControls);
    if (UI.elements.developerPanel) {
      UI.elements.developerPanel.style.display = Config.CONFIG.DEVELOPER_MODE
        ? "flex"
        : "none";
    }
    Store.saveSettings();
    Speaker.init(
      () => Store.get().voices,
      () => Store.get().settings
    );
    WakeLock.init();
  }

  function bindEventSubscriptions() {
    // listen for requests to set app state and apply directly (no re-emit of same event)
    Events.on("app:state:set", (s) => setAppStateDirect(s));
    Events.on("app:settings:resetToDefault", resetToDefaultSettings);
    Events.on("app:fullReset", fullReset);
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
})();

/* ===========================
 * Cross-cutting / Init
 * minimal global subscriptions
 * =========================== */
Events.on("settings:changed", () => {
  // placeholder for future reactions
});

App.init();
