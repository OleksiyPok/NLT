// Settings and state of the app; the settings are saved in localStorage.
import { STORAGE_KEY } from "./config.js";
import { EventTypes } from "./event-types.js";

export function createStore({ bus }) {
  const Storage = {
    save(settings) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn("LS save failed", e);
      }
    },
    load() {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        console.warn("LS load failed", e);
        return null;
      }
    },
    remove() {
      try {
        localStorage.removeItem(STORAGE_KEY);
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

  function normalizeThemaInSettings(settings) {
    const reg = typeof window !== "undefined" ? window.NLTThemeRegistry : null;
    if (!reg || !Array.isArray(reg.themeValues)) return;
    const tv = reg.themeValues;
    let raw = String(settings.thema || "");
    if (typeof reg.resolveThemaKey === "function") raw = reg.resolveThemaKey(raw);
    settings.thema = raw;
    if (tv.includes(raw)) return;
    const parsed = typeof reg.parseThema === "function" ? reg.parseThema(raw) : null;
    const composed =
      parsed && typeof reg.composeThema === "function" ? reg.composeThema(parsed.palette, parsed.mode) : null;
    settings.thema = composed || (typeof reg.defaultTheme === "string" ? reg.defaultTheme : raw);
  }

  const getState = () => structuredClone(state);
  const getSettings = () => ({ ...state.settings });
  const updateSettings = (patch) => {
    state.settings = { ...state.settings, ...patch };
    Storage.save(state.settings);
    bus.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
  };
  const resetSettings = (defaults) => {
    state.settings = { ...defaults };
    Storage.save(state.settings);
    bus.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
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
      const migrated = { ...loaded };
      if (!("intervalMs" in migrated) && "delay" in migrated) {
        migrated.intervalMs = migrated.delay;
        delete migrated.delay;
      }
      state.settings = { ...state.settings, ...migrated };
      const themaBefore = state.settings.thema;
      normalizeThemaInSettings(state.settings);
      if (state.settings.thema !== themaBefore) {
        Storage.save(state.settings);
      }
      bus.emit(EventTypes.SETTINGS_CHANGED, { ...state.settings });
    }
    return getSettings();
  };

  bus.on(EventTypes.SETTINGS_UPDATE, (patch) => {
    if (patch && typeof patch === "object") updateSettings(patch);
  });

  bus.on(EventTypes.PLAYBACK_INDEX_SET, (i) => {
    setCurrentIndex(i);
  });

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
