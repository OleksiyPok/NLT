"use strict";

/*
 Moduleized single-file refactor.
 Comments minimal and in English.
*/

// --- Module: App (main) ---
const NLTApp = (() => {
  // --- Module: Config ---
  // app configuration
  const Config = {
    PATHS: { CONFIG: "script/config.json" },
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
          if (ext.DEFAULT_SETTINGS?.mobile) {
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.mobile,
              ext.DEFAULT_SETTINGS.mobile
            );
          }
          if (ext.DEFAULT_SETTINGS?.desktop) {
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.desktop,
              ext.DEFAULT_SETTINGS.desktop
            );
          }
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

  // --- Module: Utils ---
  // small helpers
  const Utils = {
    $: (s) => document.querySelector(s),
    $all: (s) => Array.from(document.querySelectorAll(s)),
    delay: (ms) => new Promise((res) => setTimeout(res, ms)),
    safeNumber: (v, f) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : f;
    },
    normalizeString: (s = "") =>
      String(s)
        .toLowerCase()
        .replace(/[_\s]+/g, "-")
        .trim(),
    isMobileDevice: (() => {
      const MOBILE_REGEX =
        /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      return () => {
        if (
          navigator.userAgentData &&
          typeof navigator.userAgentData.mobile === "boolean"
        ) {
          return navigator.userAgentData.mobile;
        }
        return MOBILE_REGEX.test(navigator.userAgent || "");
      };
    })(),
  };

  // --- Module: State ---
  // shared application state
  const state = {
    appState: null,
    settings: {},
    texts: {},
    voices: [],
    availableLanguages: [],
    inputs: [],
    playQueue: [],
    currentIndex: 0,
    repeatsRemaining: 1,
  };

  // --- Module: Storage ---
  // localStorage helpers
  const Storage = {
    KEY: "NLT_settings",
    save(settings) {
      if (!Config.CONFIG.USE_LOCAL_STORAGE) return;
      try {
        localStorage.setItem(this.KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn("LS save failed", e);
      }
    },
    load() {
      if (!Config.CONFIG.USE_LOCAL_STORAGE) return null;
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

  // --- Module: WakeLock ---
  // handle screen wake lock
  const WakeLock = {
    wakeLock: null,
    async request() {
      try {
        if ("wakeLock" in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          if (
            this.wakeLock &&
            typeof this.wakeLock.addEventListener === "function"
          ) {
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
        if (typeof this.wakeLock.release === "function")
          this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    },
    init() {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (state.appState === Config.CONFIG.ENUMS.AppStates.PLAYING)
            this.request();
        } else {
          this.release();
        }
      });
    },
  };

  // --- Module: Voices ---
  // voices collection & select population
  const Voices = {
    collect() {
      const voices = speechSynthesis.getVoices() || [];
      state.voices = voices;
      state.availableLanguages = Array.from(
        new Set(
          voices
            .map((v) => (v.lang || "").split("-")[0].toUpperCase())
            .filter(Boolean)
        )
      ).sort();
      if (!state.availableLanguages.includes("ALL"))
        state.availableLanguages.push("ALL");
    },
    async load() {
      this.collect();
      if (!state.voices.length) {
        try {
          speechSynthesis.speak(new SpeechSynthesisUtterance(""));
          await Utils.delay(250);
          this.collect();
        } catch (e) {
          console.warn("Voice fallback failed", e);
        }
      }
    },
    onVoicesChanged() {
      this.collect();
      UI.populateLanguageSelect();
      UI.populateVoiceSelect();
    },
  };

  // hook voiceschanged
  speechSynthesis.onvoiceschanged = () => Voices.onVoicesChanged();

  // --- Module: UI ---
  // DOM caching and UI logic with reduced DOM ops
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

    attachEventHandlers() {
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
      E.startPauseBtn?.addEventListener("click", () =>
        Handlers.onStartPauseClick()
      );
    },

    resetRepeatLeft() {
      if (this.elements.repeatLeft && this.elements.repeatSelect) {
        const val = this.elements.repeatSelect.value;
        if (this.elements.repeatLeft.textContent !== val)
          this.elements.repeatLeft.textContent = val;
      }
      this.updateControlsState();
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
  };

  // --- Module: Handlers ---
  // small UI handler wrappers
  const Handlers = {
    onUiLangChange() {
      UI.updateUILabels();
      UI.updateSettingsFromUI();
    },
    onLanguageCodeChange() {
      UI.populateVoiceSelect();
      UI.updateSettingsFromUI();
    },
    onVoiceChange() {
      UI.updateSettingsFromUI();
    },
    onDigitLengthChange() {
      UI.fillRandom();
      UI.highlightSelection();
    },
    onCountChange() {
      UI.highlightSelection();
    },
    onRepeatChange() {
      UI.resetRepeatLeft();
    },
    onSpeedChange() {
      UI.updateSettingsFromUI();
    },
    onDelayChange() {
      UI.updateSettingsFromUI();
    },
    onFillRandomClick() {
      UI.fillRandom();
      UI.highlightSelection();
    },
    onFullscreenChange() {
      UI.updateControlsState();
    },
    onResetSettingsClick() {
      App.resetToDefaultSettings();
    },
    onStartPauseClick() {
      Playback.togglePlay();
    },
  };

  // --- Module: Playback ---
  const Playback = {
    buildPlayQueue() {
      state.playQueue = state.inputs.filter((i) =>
        i.classList.contains("selected")
      );
    },
    stopPlayback() {
      speechSynthesis.cancel();
      App.setAppState(Config.CONFIG.ENUMS.AppStates.READY);
      UI.hideBackgroundOverlay();
      state.currentIndex = 0;
      state.playQueue = [];
      state.repeatsRemaining = Utils.safeNumber(
        UI.elements.repeatSelect?.value,
        1
      );
      UI.resetRepeatLeft();
      UI.highlightSelection();
      WakeLock.release();
    },
    speakUtterance(utter) {
      return new Promise((resolve) => {
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
      });
    },
    async playSequence(isResume = false) {
      await WakeLock.request();
      if (state.appState !== Config.CONFIG.ENUMS.AppStates.PLAYING) return;
      const delayMs = Utils.safeNumber(UI.elements.delaySelect?.value, 500);

      while (state.appState === Config.CONFIG.ENUMS.AppStates.PLAYING) {
        if (state.currentIndex >= state.playQueue.length) {
          if (state.repeatsRemaining > 1) {
            state.repeatsRemaining -= 1;
            if (UI.elements.repeatLeft)
              UI.elements.repeatLeft.textContent = String(
                state.repeatsRemaining
              );
            state.currentIndex = 0;
          } else {
            this.stopPlayback();
            return;
          }
        }

        const input = state.playQueue[state.currentIndex];
        if (!input || !input.value) {
          state.currentIndex += 1;
          await Utils.delay(delayMs);
          continue;
        }

        UI.highlightSelection();
        UI.showBackgroundOverlay();
        UI.showActiveNumberOverlay(input.value, delayMs);

        const utter = new SpeechSynthesisUtterance(input.value);
        const selectedVoiceName = UI.elements.voiceSelect?.value;
        const selectedVoice = state.voices.find(
          (v) => v.name === selectedVoiceName
        );
        if (selectedVoice) {
          utter.voice = selectedVoice;
          utter.lang = selectedVoice.lang;
        } else {
          utter.lang = state.settings.languageCode || "nl-NL";
        }
        utter.rate = Number(state.settings.speed) || 1.0;

        await this.speakUtterance(utter);

        if (state.appState !== Config.CONFIG.ENUMS.AppStates.PLAYING) break;
        state.currentIndex += 1;
        await Utils.delay(delayMs);
      }
    },
    togglePlay() {
      if (state.appState === Config.CONFIG.ENUMS.AppStates.PLAYING) {
        speechSynthesis.cancel();
        App.setAppState(Config.CONFIG.ENUMS.AppStates.PAUSED);
        UI.hideBackgroundOverlay();
        UI.hideActiveNumberOverlay();
        return;
      }
      if (state.appState === Config.CONFIG.ENUMS.AppStates.PAUSED) {
        App.setAppState(Config.CONFIG.ENUMS.AppStates.PLAYING);
        this.playSequence(true).catch((e) =>
          console.warn("playSequence failed", e)
        );
        UI.hideBackgroundOverlay();
        UI.hideActiveNumberOverlay();
        return;
      }
      state.repeatsRemaining = Utils.safeNumber(
        UI.elements.repeatSelect?.value,
        1
      );
      if (UI.elements.repeatLeft)
        UI.elements.repeatLeft.textContent = String(state.repeatsRemaining);
      this.buildPlayQueue();
      state.currentIndex = 0;
      App.setAppState(Config.CONFIG.ENUMS.AppStates.PLAYING);
      UI.showBackgroundOverlay();
      this.playSequence(false).catch((e) =>
        console.warn("playSequence failed", e)
      );
    },
  };

  // --- Module: App (methods) ---
  const App = {
    async handleDOMContentLoaded() {
      UI.cache();
      await Config.load();

      state.settings = Config.CONFIG.USE_LOCAL_STORAGE
        ? Storage.load() || App.getDefaultSettings()
        : App.getDefaultSettings();

      state.settings.digitLength = Utils.safeNumber(
        UI.safeSetSelectValue(
          UI.elements.digitLengthSelect,
          String(state.settings.digitLength),
          "2"
        ),
        2
      );
      state.settings.count = Utils.safeNumber(
        UI.safeSetSelectValue(
          UI.elements.countSelect,
          String(state.settings.count),
          "40"
        ),
        40
      );
      state.settings.repeat = Utils.safeNumber(
        UI.safeSetSelectValue(
          UI.elements.repeatSelect,
          String(state.settings.repeat),
          "1"
        ),
        1
      );
      state.settings.speed = Utils.safeNumber(
        UI.safeSetSelectValue(
          UI.elements.speedSelect,
          String(state.settings.speed),
          "1.0"
        ),
        1.0
      );
      state.settings.delay = Utils.safeNumber(
        UI.safeSetSelectValue(
          UI.elements.delaySelect,
          String(state.settings.delay),
          "1000"
        ),
        1000
      );
      state.settings.fullscreen = UI.safeSetSelectValue(
        UI.elements.fullscreenSelect,
        String(state.settings.fullscreen),
        "0"
      );

      if (state.settings.uiLang && UI.elements.uiLangSelect) {
        UI.elements.uiLangSelect.value = state.settings.uiLang;
      }

      if (window.embeddedUITexts) {
        state.texts = window.embeddedUITexts;
        UI.updateUILabels();
      }

      App.setAppState(Config.CONFIG.ENUMS.AppStates.READY);
      UI.hideBackgroundOverlay();
      await Voices.load();

      if (Utils.isMobileDevice()) {
        [UI.elements.languageCodeSelect, UI.elements.labelLanguageCode].forEach(
          (el) => el && (el.style.display = "none")
        );
      }

      UI.cacheInputs();
      UI.populateLanguageSelect();
      UI.populateVoiceSelect();
      UI.fillRandom();
      UI.highlightSelection();
      UI.attachEventHandlers();

      UI.elements.resetBtn?.addEventListener("click", App.fullReset);
      if (UI.elements.startPauseBtn) UI.elements.startPauseBtn.disabled = false;
      UI.resetRepeatLeft();
      document.addEventListener("keydown", App.handleKeyControls);

      if (UI.elements.developerPanel) {
        UI.elements.developerPanel.style.display = Config.CONFIG.DEVELOPER_MODE
          ? "flex"
          : "none";
      }
    },

    handleKeyControls(event) {
      const tag = document.activeElement?.tagName || "";
      const isTyping = ["INPUT", "TEXTAREA"].includes(tag);

      if (
        event.key === "Escape" ||
        event.key === "Esc" ||
        event.code === "Escape" ||
        event.keyCode === 27
      ) {
        event.preventDefault();
        UI.elements.resetBtn?.click();
      }
      if (
        (event.key === " " ||
          event.key === "Spacebar" ||
          event.code === "Space" ||
          event.keyCode === 32) &&
        !isTyping
      ) {
        event.preventDefault();
        UI.elements.startPauseBtn?.click();
      }
    },

    getDefaultSettings() {
      const type = Utils.isMobileDevice() ? "mobile" : "desktop";
      return { ...Config.CONFIG.DEFAULT_SETTINGS[type] };
    },

    setAppState(s) {
      state.appState = s;
      UI.updateStartPauseButton();
      UI.updateControlsState();
    },

    async resetToDefaultSettings() {
      Storage.remove();
      speechSynthesis.cancel();
      Playback.stopPlayback();
      state.settings = App.getDefaultSettings();

      UI.safeSetSelectValue(
        UI.elements.digitLengthSelect,
        String(state.settings.digitLength),
        "2"
      );
      UI.safeSetSelectValue(
        UI.elements.countSelect,
        String(state.settings.count),
        "40"
      );
      UI.safeSetSelectValue(
        UI.elements.repeatSelect,
        String(state.settings.repeat),
        "1"
      );
      UI.safeSetSelectValue(
        UI.elements.speedSelect,
        String(state.settings.speed),
        "1.0"
      );
      UI.safeSetSelectValue(
        UI.elements.delaySelect,
        String(state.settings.delay),
        "1000"
      );
      UI.safeSetSelectValue(
        UI.elements.fullscreenSelect,
        String(state.settings.fullscreen),
        "0"
      );

      if (UI.elements.uiLangSelect)
        UI.elements.uiLangSelect.value = state.settings.uiLang;
      if (UI.elements.languageCodeSelect) {
        UI.populateLanguageSelect();
        UI.elements.languageCodeSelect.value = (
          state.settings.languageCode || "ALL"
        )
          .split(/[-_]/)[0]
          .toUpperCase();
        await Utils.delay(0);
        UI.populateVoiceSelect();
      }
      if (UI.elements.voiceSelect)
        UI.elements.voiceSelect.value = state.settings.voiceName;

      Storage.save(state.settings);
      UI.updateUILabels();
      UI.fillRandom();
      UI.highlightSelection();
      UI.resetRepeatLeft();
    },

    fullReset() {
      speechSynthesis.cancel();
      Playback.stopPlayback();
    },

    init() {
      const updateViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      };
      window.addEventListener("resize", updateViewportHeight);
      window.addEventListener("orientationchange", updateViewportHeight);
      window.addEventListener("load", updateViewportHeight);

      WakeLock.init();
      document.addEventListener("DOMContentLoaded", () =>
        this.handleDOMContentLoaded()
      );
    },
  };

  return { init: () => App.init(), _internal: { Config, Utils, state } };
})();

NLTApp.init();
