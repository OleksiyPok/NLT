// Constants and the default settings (config/config.json).
import { Utils } from "./utils.js";

// Shown on the main screen (change it with every change of the app)
export const APP_VERSION = "3.5.2";

// Folder of the help pages
export const HELP_DIR = "docs/help/";

// Languages of the help pages (docs/help/help.<lang>.html); for the other languages the English page is shown
export const HELP_LANGS = ["de", "en", "fr", "nl", "pl", "pt", "ru", "tr", "uk"];

// Key of the saved settings in localStorage
export const STORAGE_KEY = "NLT-settings";

// Language chosen in the help window
export const HELP_LANGUAGE_KEY = "NLT-help-language";

// Default settings come only from config/config.json (the same idea as in DT).
// config.json: common values; the "mobile" block overrides them on phones and tablets.
export function createConfig() {
  const PATHS = {
    CONFIG: "config/config.json",
    UI_TEXTS_DIR: "src/i18n",
  };
  const UI_LANGS = Object.freeze(["ar", "cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "ru", "tr", "uk"]);

  let defaults = null;

  // "true", "1", 1 -> 1; everything else -> 0
  const toFlag = (v) => (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true" ? 1 : 0);

  return {
    PATHS,
    UI_LANGS,

    async load() {
      const res = await fetch(PATHS.CONFIG, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${PATHS.CONFIG}: ${res.status}`);
      const { mobile, ...common } = await res.json();
      defaults = { ...common, ...(Utils.isMobileDevice() ? mobile : {}) };
      defaults.fullscreen = toFlag(defaults.fullscreen);
      defaults.developerMode = Boolean(defaults.developerMode);
    },

    // Copy of the defaults for this device
    getDefaults() {
      return { ...defaults };
    },
  };
}
