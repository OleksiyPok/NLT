"use strict";

// ==== События ====
const EventTypes = Object.freeze({
  APP_INIT: "app:init",
  APP_STATE: "app:state",
  APP_STATE_SET: "app:state:set",
  CONFIG_LOADED: "app:config:loaded",

  SETTINGS_LOAD: "settings:load",
  SETTINGS_SAVE: "settings:save",
  SETTINGS_APPLY: "settings:apply",
  SETTINGS_RESET: "settings:resetToDefaults",

  UI_TEXTS_UPDATE: "ui:texts:update",
  UI_TRANSLATE: "ui:translate",
  UI_SPEAK_SINGLE: "ui:speak:single",
  UI_SPEAK_GROUP: "ui:speak:group",

  SPEECH_START: "speech:start",
  SPEECH_END: "speech:end",

  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",

  PLAYBACK_START: "playback:start",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_CONTINUE: "playback:continue",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_FINISH: "playback:finish",

  UPDATE_CONTROLS: "ui:updateControls",
});

// ==== EventBus ====
function createEventBus() {
  const map = new Map();
  return {
    on(event, handler) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(handler);
      return () => map.get(event)?.delete(handler);
    },
    off(event, handler) {
      const s = map.get(event);
      if (!s) return false;
      if (!handler) {
        map.delete(event);
        return true;
      }
      return s.delete(handler);
    },
    once(event, handler) {
      let off;
      off = this.on(event, (payload) => {
        off();
        handler(payload);
      });
      return off;
    },
    emit(event, payload) {
      const subs = Array.from(map.get(event) || []);
      for (const fn of subs) {
        try {
          fn(payload);
        } catch (e) {
          console.warn("EventBus handler error", event, e);
        }
      }
    },
  };
}

// ==== Утилиты ====
function createUtils() {
  const ALLOWED_LANGS = [
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
  ];

  const capitalize = (s) =>
    s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";

  function deepMerge(a, b) {
    if (!b) return JSON.parse(JSON.stringify(a || {}));
    if (!a) return JSON.parse(JSON.stringify(b || {}));
    const out = Array.isArray(a) ? [] : {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => {
      const va = a[k],
        vb = b[k];
      if (
        va &&
        typeof va === "object" &&
        !Array.isArray(va) &&
        vb &&
        typeof vb === "object" &&
        !Array.isArray(vb)
      ) {
        out[k] = deepMerge(va, vb);
      } else if (vb !== undefined) {
        out[k] = vb;
      } else {
        out[k] = va;
      }
    });
    return out;
  }

  function safeSetSelectValue(selectEl, value, fallback = "") {
    if (!selectEl) return;
    const options = Array.from(selectEl.options || []);
    const found = options.find((o) => String(o.value) === String(value));
    if (found) selectEl.value = String(value);
    else if (
      fallback &&
      options.find((o) => String(o.value) === String(fallback))
    ) {
      selectEl.value = String(fallback);
    } else if (options.length) {
      selectEl.value = options[0].value;
    }
  }

  function normalizeString(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  return {
    ALLOWED_LANGS,
    deepMerge,
    safeSetSelectValue,
    normalizeString,
    capitalize,
  };
}

// ==== Конфигурация ====
function createConfig(utils, { paths = null } = {}) {
  const PATHS = paths || {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
  };

  const DEFAULT_CONFIG = Object.freeze({
    DEVELOPER_MODE: false,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      shared: {
        uiLang: "en",
        delay: "1000",
        speed: "1.0",
        fullscreen: "0",
        digitLength: "2",
        count: "10",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      mobile: {},
      desktop: {},
    },
  });

  const FALLBACK = Object.freeze({
    DEVELOPER_MODE: true,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    uiLang: "en",
    delay: "1000",
    speed: "1.0",
    fullscreen: "0",
    digitLength: "2",
    count: "10",
    languageCode: "nl-NL",
    voiceName: "Google Nederlands",
  });

  async function loadExternal() {
    try {
      const resp = await fetch(PATHS.CONFIG, { cache: "no-store" });
      if (!resp.ok) return utils.deepMerge(DEFAULT_CONFIG, {});
      const json = await resp.json();
      return utils.deepMerge(DEFAULT_CONFIG, json);
    } catch (e) {
      return utils.deepMerge(DEFAULT_CONFIG, {});
    }
  }

  function selectPlatformDefaults(defs) {
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(
      navigator.userAgent || ""
    );
    const platformSettings = isMobile
      ? defs?.mobile || {}
      : defs?.desktop || {};
    return utils.deepMerge(
      DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop,
      platformSettings
    );
  }

  return {
    PATHS,
    DEFAULT_CONFIG,
    FALLBACK,
    loadExternal,
    selectPlatformDefaults,
  };
}

// ==== Загрузчик локализации ====
function createLangLoader({ config, utils }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};

  const FALLBACK_EN = {
    btnStart: "Start",
    btnStop: "Stop",
    btnContinue: "Continue",
    fillRandom: "Fill random",
    alertInvalidFormat: "Invalid input format",
    alertInvalidPhrase: "Invalid phrase",
    speakBtnTitle: "Speak",
    randomBtnTitle: "Random",
    labelDigitLength: "Digit length",
    labelCount: "Count",
  };

  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      return null;
    }
  }

  async function loadAll(allowed) {
    texts = {};
    const langs = Array.isArray(allowed)
      ? allowed
      : config.DEFAULT_CONFIG
      ? Object.keys(config.DEFAULT_CONFIG.DEFAULT_SETTINGS)
      : ["en"];
    await Promise.all(
      langs.map(async (code) => {
        const d = await loadLang(code);
        if (d) texts[code] = d;
      })
    );
    if (!texts.en) texts.en = FALLBACK_EN;
    return texts;
  }

  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;

  return { loadLang, loadAll, getTexts };
}

// ==== Store (localStorage + состояние) ====
function createStore({ bus, config, utils }) {
  const KEY = "NLT-settings";
  const canUseLocal = Boolean(
    config.DEFAULT_CONFIG?.USE_LOCAL_STORAGE ||
      config.FALLBACK?.USE_LOCAL_STORAGE
  );

  const Storage = {
    save(s) {
      if (!canUseLocal) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch (e) {}
    },
    load() {
      if (!canUseLocal) return null;
      try {
        const v = localStorage.getItem(KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    remove() {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
    },
  };

  let defaultsActive = {
    uiLang: "en",
    delay: "1000",
    speed: "1.0",
    fullscreen: "0",
    digitLength: "2",
    count: "10",
    languageCode: "nl-NL",
    voiceName: "Google Nederlands",
  };

  let current = { ...defaultsActive };

  let playbackFlags = {
    isSequenceMode: false,
    isPaused: false,
    isSpeaking: false,
    sequenceIndex: 0,
  };

  let currentSpeakButton = null;

  function setDefaultActive(defs) {
    defaultsActive = { ...defaultsActive, ...defs };
  }

  function setSettings(s) {
    current = { ...current, ...s };
    bus.emit(EventTypes.CONFIG_LOADED, current);
  }

  function getSettings() {
    return { ...current };
  }

  function saveSettings(s) {
    Storage.save(s);
  }

  function loadSettingsFromLocal() {
    const raw = {};
    const merged = { ...defaultsActive };
    try {
      const saved = Storage.load();
      if (saved) Object.assign(merged, saved);
      return { raw, merged };
    } catch (e) {
      return { raw, merged };
    }
  }

  function setPlaybackFlags(f) {
    playbackFlags = { ...playbackFlags, ...f };
  }

  function playbackFlagsGet() {
    return { ...playbackFlags };
  }

  function setCurrentSpeakButton(b) {
    currentSpeakButton = b;
  }

  function getCurrentSpeakButton() {
    return currentSpeakButton;
  }

  function getDefaultActive() {
    return defaultsActive;
  }

  return {
    setDefaultActive,
    setSettings,
    getSettings,
    saveSettings,
    loadSettingsFromLocal,
    setPlaybackFlags,
    playbackFlags: playbackFlagsGet,
    setCurrentSpeakButton,
    getCurrentSpeakButton,
    getDefaultActive,
  };
}

// ==== WakeLock ====
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

// ==== Voices ====
function createVoices({ bus }) {
  let voices = [];
  let availableLanguages = [];

  function computeAvailableLanguages() {
    availableLanguages = Array.from(
      new Set(
        (voices || []).map((v) =>
          ((v.lang || "").split(/[-_]/)[0] || "").toUpperCase()
        )
      )
    ).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.unshift("ALL");
  }

  function publish(evt) {
    const lightweight = (voices || []).map((v) => ({
      name: v.name,
      lang: v.lang,
    }));
    bus.emit(evt, {
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
        await new Promise((r) => setTimeout(r, 250));
        collect();
      } catch (e) {}
    }
    publish(EventTypes.VOICES_LOADED);
  }

  if ("onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => collect();
  }

  return {
    collect,
    load,
    getVoices: () => voices.slice(),
    getAvailableLanguages: () => availableLanguages.slice(),
  };
}

// ==== Speaker ====
function createSpeaker({ bus, voicesProvider, settingsProvider } = {}) {
  let currentUtter = null;

  let getVoices = () =>
    typeof voicesProvider === "function" ? voicesProvider() : [];
  let getSettings = () =>
    typeof settingsProvider === "function" ? settingsProvider() : {};

  function _selectVoice(settings) {
    const all = getVoices() || [];
    if (!all.length) return null;

    const desiredName = String(settings.voiceName || "").trim();
    const desiredLang = String(settings.languageCode || "")
      .trim()
      .toLowerCase();

    if (desiredName) {
      const exact = all.find((v) => v.name === desiredName);
      if (exact) return exact;

      const norm = (n) =>
        String(n || "")
          .trim()
          .toLowerCase();
      const partial = all.find((v) => norm(v.name).includes(norm(desiredName)));
      if (partial) return partial;
    }

    if (desiredLang) {
      const byFull = all.find(
        (v) => (v.lang || "").toLowerCase() === desiredLang
      );
      if (byFull) return byFull;

      const base = desiredLang.split(/[-_]/)[0];
      if (base) {
        const byBase = all.find(
          (v) => ((v.lang || "").split(/[-_]/)[0] || "").toLowerCase() === base
        );
        if (byBase) return byBase;
      }
    }

    const navBase = (navigator.language || "").split(/[-_]/)[0];
    if (navBase) {
      const nav = all.find((v) =>
        (v.lang || "").toLowerCase().startsWith(navBase)
      );
      if (nav) return nav;
    }

    return all[0] || null;
  }

  async function speakAsync(text, opts = {}) {
    if (!text) return;

    const settings = { ...(getSettings() || {}), ...opts };

    if (opts.interrupt !== false && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    }

    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(String(text));
      const chosen = _selectVoice(settings);

      if (chosen) {
        try {
          utter.voice = chosen;
          utter.lang = chosen.lang || settings.languageCode || utter.lang;
        } catch (e) {
          if (settings.languageCode) utter.lang = settings.languageCode;
        }
      } else {
        if (settings.languageCode) utter.lang = settings.languageCode;
      }

      const rate =
        Number.isFinite(Number(settings.rate ?? settings.speed)) &&
        Number(settings.rate ?? settings.speed) > 0
          ? Number(settings.rate ?? settings.speed)
          : 1.0;

      const pitch =
        Number.isFinite(Number(settings.pitch)) && Number(settings.pitch) > 0
          ? Number(settings.pitch)
          : 1.0;

      const volume =
        Number.isFinite(Number(settings.volume)) &&
        Number(settings.volume) >= 0 &&
        Number(settings.volume) <= 1
          ? Number(settings.volume)
          : 1.0;

      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = volume;

      return new Promise((resolve) => {
        const done = () => {
          currentUtter = null;
          bus.emit(EventTypes.SPEECH_END, { button: opts.button || null });
          resolve(true);
        };
        utter.onend = done;
        utter.onerror = done;
        currentUtter = utter;
        bus.emit(EventTypes.SPEECH_START, { button: opts.button || null });
        speechSynthesis.speak(utter);
      });
    }

    if (window.fetch) {
      try {
        const res = await fetch("/speak", {
          method: "POST",
          body: JSON.stringify({ text, opts }),
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
    if (typeof obj === "string") {
      return speakAsync(obj).catch((e) => console.warn("speak failed", e));
    }
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
      if (
        "speechSynthesis" in window &&
        (speechSynthesis.speaking || speechSynthesis.pending)
      ) {
        speechSynthesis.cancel();
      }
    } catch (e) {}
    if (currentUtter) {
      bus.emit(EventTypes.SPEECH_END, { button: null });
      currentUtter = null;
    }
  }

  const pause = () => {
    try {
      speechSynthesis.pause();
    } catch (e) {}
  };

  const resume = () => {
    try {
      speechSynthesis.resume();
    } catch (e) {}
  };

  return {
    init(settingsProvider, voicesProvider) {
      if (typeof voicesProvider === "function") voicesProvider = voicesProvider;
      if (typeof settingsProvider === "function")
        settingsProvider = settingsProvider;
    },
    speak,
    speakAsync,
    cancel,
    pause,
    resume,
    _selectVoice,
  };
}
// ==== UI (NLT specific) ====
function createUI({ bus, store, config, langLoader, utils }) {
  const PLAY_ICON = "▶️";
  const STOP_ICON = "⏹️";

  const els = {
    delaySelectEl: document.getElementById("delaySelect"),
    speedSelectEl: document.getElementById("speedSelect"),
    startPauseBtnEl: document.getElementById("startPauseBtn"),
    resetBtnEl: document.getElementById("resetBtn"),
    resetSettingsBtnEl: document.getElementById("resetSettingsBtn"),
    fillRandomBtnEl: document.getElementById("fillRandomBtn"),
    uiLangSelectEl: document.getElementById("uiLangSelect"),
    digitLengthSelectEl: document.getElementById("digitLengthSelect"),
    countSelectEl: document.getElementById("countSelect"),
    randomBtnEls: document.querySelectorAll(".random-btn"),
    speakBtnEls: document.querySelectorAll(".speak-btn"),
    numberInputEls: document.querySelectorAll(".number-input"),
    numberContainerEls: document.querySelectorAll(".number-container"),
    developerBlockEl: document.getElementById("developer"),
  };

  function disableSpeakButtons(disable) {
    els.speakBtnEls.forEach((b) => b && (b.disabled = disable));
  }

  function toggleControls(enabled) {
    if (els.speedSelectEl) els.speedSelectEl.disabled = !enabled;
    if (els.delaySelectEl) els.delaySelectEl.disabled = !enabled;
    if (els.digitLengthSelectEl) els.digitLengthSelectEl.disabled = !enabled;
    if (els.countSelectEl) els.countSelectEl.disabled = !enabled;
    document
      .querySelectorAll(
        'label[for="speedSelect"],label[for="delaySelect"],label[for="digitLengthSelect"],label[for="countSelect"]'
      )
      .forEach((l) => l.classList.toggle("disabled", !enabled));
  }

  function setActiveInput(index) {
    els.numberInputEls.forEach((inp) => inp?.classList.remove("highlight"));
    els.randomBtnEls.forEach((btn) => btn && (btn.disabled = false));
    if (index >= 0 && index < els.numberInputEls.length) {
      const inp = els.numberInputEls[index];
      inp?.classList.add("highlight");
      const rnd = inp?.parentElement?.querySelector(".random-btn");
      if (rnd) rnd.disabled = true;
    }
  }

  function updateButtonIcon(btn, state) {
    if (!btn) return;
    if (state === "speaking") btn.textContent = STOP_ICON;
    else btn.textContent = PLAY_ICON;
  }

  function setBtnText(el, text) {
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
  }

  function translateUI(lang) {
    const texts = langLoader.getTexts(lang);
    if (!texts) return;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && texts[key]) el.textContent = texts[key];
    });
    document
      .querySelectorAll(".speak-btn")
      .forEach((b) => (b.title = texts.speakBtnTitle || ""));
    document
      .querySelectorAll(".random-btn")
      .forEach((b) => (b.title = texts.randomBtnTitle || ""));
  }

  function applySettingsToUI(
    s,
    { preferBlankForInvalid = true, raw = {} } = {}
  ) {
    const setOrBlank = (sel, cand, fallback) => {
      if (!sel) return;
      const hasOpt = (val) =>
        Array.from(sel.options).some((o) => String(o.value) === String(val));
      if (cand !== undefined && hasOpt(cand)) sel.value = String(cand);
      else if (preferBlankForInvalid) sel.value = "";
      else if (fallback !== undefined && hasOpt(fallback))
        sel.value = String(fallback);
    };

    setOrBlank(els.uiLangSelectEl, raw.uiLang ?? s.uiLang, s.uiLang);
    setOrBlank(els.speedSelectEl, raw.speed ?? s.speed, s.speed);
    setOrBlank(els.delaySelectEl, raw.delay ?? s.delay, s.delay);
    setOrBlank(
      els.digitLengthSelectEl,
      raw.digitLength ?? s.digitLength,
      s.digitLength
    );
    setOrBlank(els.countSelectEl, raw.count ?? s.count, s.count);

    const effectiveLang =
      els.uiLangSelectEl?.value ||
      s.uiLang ||
      store.getDefaultActive().uiLang ||
      config.FALLBACK?.uiLang;

    translateUI(effectiveLang);
  }

  function readSettingsFromUI() {
    const base = {
      uiLang: els.uiLangSelectEl?.value,
      speed: els.speedSelectEl?.value,
      delay: els.delaySelectEl?.value,
      digitLength: els.digitLengthSelectEl?.value,
      count: els.countSelectEl?.value,
    };

    const defaults = store.getDefaultActive ? store.getDefaultActive() : {};
    const allowedOpt = (sel, val) =>
      sel &&
      Array.from(sel.options).some((opt) => String(opt.value) === String(val));

    return {
      uiLang:
        base.uiLang &&
        utils.ALLOWED_LANGS.includes(base.uiLang) &&
        allowedOpt(els.uiLangSelectEl, base.uiLang)
          ? base.uiLang
          : defaults.uiLang,
      speed:
        !isNaN(parseFloat(base.speed)) &&
        allowedOpt(els.speedSelectEl, base.speed)
          ? base.speed
          : defaults.speed,
      delay:
        !isNaN(parseInt(base.delay, 10)) &&
        allowedOpt(els.delaySelectEl, base.delay)
          ? base.delay
          : defaults.delay,
      digitLength:
        !isNaN(parseInt(base.digitLength, 10)) &&
        allowedOpt(els.digitLengthSelectEl, base.digitLength)
          ? base.digitLength
          : defaults.digitLength,
      count:
        !isNaN(parseInt(base.count, 10)) &&
        allowedOpt(els.countSelectEl, base.count)
          ? base.count
          : defaults.count,
      fullscreen: defaults.fullscreen,
      languageCode: defaults.languageCode,
      voiceName: defaults.voiceName,
    };
  }

  function setDeveloperVisibility(appCfg) {
    const devMode =
      appCfg?.DEVELOPER_MODE ??
      config.DEFAULT_CONFIG.DEVELOPER_MODE ??
      config.FALLBACK?.DEVELOPER_MODE;
    if (els.developerBlockEl)
      els.developerBlockEl.style.display = devMode ? "" : "none";
  }

  function updateStartPauseBtnTo(state) {
    if (state === "start") setBtnText(els.startPauseBtnEl, "Start");
    else if (state === "stop") setBtnText(els.startPauseBtnEl, "Stop");
    else if (state === "cont") setBtnText(els.startPauseBtnEl, "Continue");
  }

  function updateControlsAvailability() {
    const flags = store.playbackFlags();
    const activeBtn = store.getCurrentSpeakButton();
    const activeIdx = flags.sequenceIndex;

    els.speakBtnEls.forEach((btn, idx) => {
      if (flags.isSequenceMode) btn.disabled = true;
      else if (flags.isSpeaking && activeBtn) btn.disabled = btn !== activeBtn;
      else btn.disabled = flags.isPaused;
    });

    els.randomBtnEls.forEach((btn, idx) => {
      if (flags.isSequenceMode && idx === activeIdx) btn.disabled = true;
      else if (activeBtn) {
        const speakBtn = btn?.parentElement?.querySelector(".speak-btn");
        btn.disabled = speakBtn && speakBtn === activeBtn;
      } else btn.disabled = false;
    });

    toggleControls(!(flags.isSequenceMode && !flags.isPaused));
    if (els.resetBtnEl) els.resetBtnEl.disabled = !flags.isPaused;
  }

  function bindHandlers() {
    els.numberContainerEls.forEach((group) => {
      const rnd = group.querySelector(".random-btn");
      const input = group.querySelector(".number-input");
      const speakBtn = group.querySelector(".speak-btn");

      if (rnd && input) {
        rnd.addEventListener("click", () => {
          input.value = Math.floor(Math.random() * 1000);
          bus.emit(EventTypes.UPDATE_CONTROLS);
        });
      }

      if (speakBtn && input) {
        speakBtn.addEventListener("click", () => {
          const { isSpeaking } = store.playbackFlags();
          if (isSpeaking) return;
          const raw = input.value?.trim();
          if (!raw) return;
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase: raw,
            rate: parseFloat(
              els.speedSelectEl?.value || store.getDefaultActive().speed
            ),
            button: speakBtn,
          });
        });
      }
    });

    els.fillRandomBtnEl?.addEventListener("click", () => {
      els.numberInputEls.forEach((inp, idx) => {
        const flags = store.playbackFlags();
        if (
          (flags.isSequenceMode || flags.isPaused) &&
          idx === flags.sequenceIndex
        )
          return;
        inp.value = Math.floor(Math.random() * 1000);
      });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });

    els.resetSettingsBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.SETTINGS_RESET)
    );

    els.uiLangSelectEl?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY, { saveFromUI: true });
    });

    els.speedSelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY, { saveFromUI: true })
    );

    els.delaySelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY, { saveFromUI: true })
    );

    els.digitLengthSelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY, { saveFromUI: true })
    );

    els.countSelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY, { saveFromUI: true })
    );

    els.resetBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.PLAYBACK_STOP)
    );

    els.startPauseBtnEl?.addEventListener("click", () => {
      const flags = store.playbackFlags();
      if (flags.isSequenceMode && !flags.isPaused)
        bus.emit(EventTypes.PLAYBACK_PAUSE);
      else if (flags.isSequenceMode && flags.isPaused)
        bus.emit(EventTypes.PLAYBACK_CONTINUE);
      else bus.emit(EventTypes.PLAYBACK_START, { index: 0 });
    });

    bus.on(EventTypes.UPDATE_CONTROLS, updateControlsAvailability);
    bus.on(EventTypes.SPEECH_START, () => {
      store.setPlaybackFlags({ isSpeaking: true });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.SPEECH_END, () => {
      store.setPlaybackFlags({ isSpeaking: false });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.VOICES_CHANGED, () => updateControlsAvailability);
    bus.on(EventTypes.VOICES_LOADED, () => updateControlsAvailability);
  }

  function init() {
    bindHandlers();
    const allEmpty = Array.from(els.numberInputEls || []).every(
      (inp) => !(inp.value && inp.value.trim())
    );
    if (allEmpty) els.fillRandomBtnEl?.click();
    bus.emit(EventTypes.UPDATE_CONTROLS);
  }

  return {
    els,
    disableSpeakButtons,
    toggleControls,
    setActiveInput,
    updateButtonIcon,
    setBtnText,
    translateUI,
    applySettingsToUI,
    readSettingsFromUI,
    setDeveloperVisibility,
    updateStartPauseBtnTo,
    bindHandlers,
    updateControlsAvailability,
    init,
  };
}

// ==== Playback ====
function createPlayback({ bus, store, speaker, ui }) {
  let sequence = [];
  let abort = false;

  async function playSequence() {
    const flags = store.playbackFlags();
    const rate = parseFloat(store.getSettings().speed || 1.0);
    const delay = parseInt(store.getSettings().delay || 1000, 10);

    for (let i = flags.sequenceIndex; i < ui.els.numberInputEls.length; i++) {
      if (abort) break;
      const inp = ui.els.numberInputEls[i];
      const phrase = inp?.value?.trim();
      if (!phrase) continue;

      store.setPlaybackFlags({
        isSequenceMode: true,
        isPaused: false,
        sequenceIndex: i,
      });
      ui.setActiveInput(i);
      await speaker.speakAsync(phrase, { rate });
      await new Promise((r) => setTimeout(r, delay));
    }

    store.setPlaybackFlags({
      isSequenceMode: false,
      isPaused: false,
      sequenceIndex: 0,
    });
    ui.setActiveInput(-1);
    bus.emit(EventTypes.PLAYBACK_FINISH);
  }

  function start(index = 0) {
    abort = false;
    store.setPlaybackFlags({
      isSequenceMode: true,
      isPaused: false,
      sequenceIndex: index,
    });
    playSequence();
  }

  function pause() {
    store.setPlaybackFlags({ isPaused: true });
  }

  function cont() {
    store.setPlaybackFlags({ isPaused: false });
    playSequence();
  }

  function stop() {
    abort = true;
    store.setPlaybackFlags({
      isSequenceMode: false,
      isPaused: false,
      sequenceIndex: 0,
    });
    ui.setActiveInput(-1);
    bus.emit(EventTypes.PLAYBACK_FINISH);
  }

  bus.on(EventTypes.PLAYBACK_START, ({ index }) => start(index));
  bus.on(EventTypes.PLAYBACK_PAUSE, pause);
  bus.on(EventTypes.PLAYBACK_CONTINUE, cont);
  bus.on(EventTypes.PLAYBACK_STOP, stop);

  return { start, pause, cont, stop };
}

// ==== Bootstrap ====
async function bootstrap() {
  const bus = createEventBus();
  const utils = createUtils();
  const config = createConfig(utils);
  const langLoader = createLangLoader({ config, utils });
  const store = createStore({ bus, config, utils });
  const voices = createVoices({ bus });
  const speaker = createSpeaker({
    bus,
    voicesProvider: voices.getVoices,
    settingsProvider: store.getSettings,
  });
  const wakeLock = createWakeLock({ bus });
  const ui = createUI({ bus, store, config, langLoader, utils });
  const playback = createPlayback({ bus, store, speaker, ui });

  bus.on(EventTypes.APP_INIT, async () => {
    const extConfig = await config.loadExternal();
    store.setDefaultActive(
      config.selectPlatformDefaults(extConfig.DEFAULT_SETTINGS)
    );
    const { merged } = store.loadSettingsFromLocal();
    store.setSettings(merged);
    ui.applySettingsToUI(merged, { raw: merged });
    ui.setDeveloperVisibility(extConfig);
    await langLoader.loadAll(utils.ALLOWED_LANGS);
    voices.load();
    wakeLock.init();
    ui.init();
  });

  bus.emit(EventTypes.APP_INIT);
}

document.addEventListener("DOMContentLoaded", bootstrap);
