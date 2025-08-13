"use strict";

import { Voices } from "../modules/voices.js";
import { Speech } from "../modules/speech.js";
import { Config } from "../modules/config.js";
import { Utils } from "../modules/utils.js";
import { Storage } from "../modules/storage.js";
import { createUI } from "../modules/ui.js";


import { createHandlers } from "../modules/handlers.js";
const NLTApp = (() => {
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

  const UI = createUI(state);

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
            this.wakeLock.addEventListener("release", () => {});
          }
        }
      } catch (e) {
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
  const App = {
    async handleDOMContentLoaded() {
      UI.cache();
      await Config.load();

      state.settings = App.getDefaultSettings();
      if (Config.CONFIG.USE_LOCAL_STORAGE) {
        const saved = Storage.load();
        if (saved && typeof saved === "object")
          Object.assign(state.settings, saved);
      }

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

      if (state.settings.uiLang && UI.elements.uiLangSelect)
        UI.elements.uiLangSelect.value = state.settings.uiLang;

      if (window.embeddedUITexts) {
        state.texts = window.embeddedUITexts;
        UI.updateUILabels();
      }

      App.setAppState(Config.CONFIG.ENUMS.AppStates.READY);
      UI.hideBackgroundOverlay();

      state.config = Config.CONFIG;

      Voices.init && Voices.init(state, Utils, UI);
      Speech.init && Speech.init(state, Utils, UI, WakeLock);

      speechSynthesis.onvoiceschanged = () => {
        Voices.onVoicesChanged
          ? Voices.onVoicesChanged(state, UI)
          : Voices.load && Voices.load(state, UI, Utils);
      };

      if (Voices.load) {
        await Voices.load(state, UI, Utils);
      } else {
        // fallback: try to collect voices directly (if module is older)
        try {
          const v = speechSynthesis.getVoices() || [];
          state.voices = v;
          state.availableLanguages = Array.from(
            new Set(
              v
                .map((x) => (x.lang || "").split("-")[0].toUpperCase())
                .filter(Boolean)
            )
          ).sort();
          if (!state.availableLanguages.includes("ALL"))
            state.availableLanguages.push("ALL");
        } catch (e) {}
      }

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
      UI.attachEventHandlers(Handlers);

      UI.elements.resetBtn?.addEventListener("click", App.fullReset);
      if (UI.elements.startPauseBtn) UI.elements.startPauseBtn.disabled = false;
      UI.resetRepeatLeft();

      UI.updateStartPauseButton();
      UI.updateControlsState();

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
      if (Speech.stopPlayback)
        Speech.stopPlayback(state, UI, Config, Utils, WakeLock);
      else Speech.stop && Speech.stop();
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
      if (Speech.stopPlayback)
        Speech.stopPlayback(state, UI, Config, Utils, WakeLock);
      else Speech.stop && Speech.stop();
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

    const Handlers = createHandlers({ UI, App, Speech, Config, Utils, WakeLock, state });

  return { init: () => App.init(), _internal: { Config, Utils, state } };
})();

NLTApp.init();
