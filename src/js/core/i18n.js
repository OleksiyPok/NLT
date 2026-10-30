// UI texts: src/i18n/<lang>.json; English is the fallback.
export function createLangLoader({ config }) {
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
    labelInterval: "Interval (ms)",
    labelFullscreen: "Fullscreen",
    labelFullscreenDelay: "Delay mode",
    labelDelayTime: "Delay (sec)",
    start: "Start",
    continue: "Continue",
    pause: "Pause",
    reset: "Reset",
    fillRandom: "🎲 Rnd",
    fullscreenNo: "No",
    fullscreenYes: "Yes",
    delayModeNo: "No",
    delayModeVisual: "Visual",
    delayModeAudio: "Audio",
    default: "Default",
    repeatsLeft: "Repeats left:",
    defaultSettings: "Reset defaults",
    labelThema: "Theme",
    labelThemaMode: "Mode",
    themaModeContrast: "Contrast",
    themaModeNormal: "Normal",
    themaModeEvening: "Evening",
    themaModeNight: "Night",
    settingsTitle: "Settings",
    closeBtn: "Close",
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
