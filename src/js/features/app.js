// The app: start, reset, keyboard and the order of the start.
import { APP_VERSION, STORAGE_KEY } from "../core/config.js";
import { EventTypes } from "../core/event-types.js";

export function createApp({ bus, config, langLoader, store, ui, voices, speaker, wakeLock, utils }) {
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

    const voiceList = voices.getVoices();
    const match = voiceList.find((v) => {
      const voiceLang = (v.lang || "").replace("_", "-").toLowerCase();
      return utils.normalizeString(v.name) === utils.normalizeString(defaultVoiceName) || voiceLang === defaultLangCode;
    });

    if (match) {
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
    } else if (voiceList.length) {
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: voiceList[0].name });
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

      if (ui.isSettingsModalOpen()) {
        bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
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

    const mergedSettings = utils.deepMerge(defaults, stored);
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

      let match = allVoices.find((v) => utils.normalizeString(v.name) === utils.normalizeString(settings.voiceName));
      if (!match) {
        match = allVoices.find((v) => utils.normalizeString(v.name).includes(utils.normalizeString(settings.voiceName)));
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
