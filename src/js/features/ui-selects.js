// Selects of the settings: values from the settings, languages and voices.
import { EventTypes } from "../core/event-types.js";

export function createUiSelects({ bus, utils, elements, view }, theme) {


  function setSelectsFromSettings(s) {
    const E = elements;
    s.digitLength = utils.safeNumber(utils.safeSetSelectValue(E.digitLengthSelect, String(s.digitLength), "2"), 2);
    s.count = utils.safeNumber(utils.safeSetSelectValue(E.countSelect, String(s.count), "40"), 40);
    s.repeat = utils.safeNumber(utils.safeSetSelectValue(E.repeatSelect, String(s.repeat), "1"), 1);
    s.speed = utils.safeNumber(utils.safeSetSelectValue(E.speedSelect, Number(s.speed).toFixed(1), "1.0"), 1.0);
    s.intervalMs = utils.safeNumber(utils.safeSetSelectValue(E.intervalSelect, String(s.intervalMs), "1000"), 1000);
    s.fullscreen = utils.safeSetSelectValue(E.fullscreenSelect, String(s.fullscreen), "0");
    s.fullscreenDelayMode = utils.safeSetSelectValue(elements.fullscreenDelayMode, s.fullscreenDelayMode, "No delay");
    s.fullscreenDelay = utils.safeSetSelectValue(elements.fullscreenDelay, String(s.fullscreenDelay), "2");

    s.thema = theme.resolveCanonicalThema(s.thema);
    theme.syncThemeSelectorsFromThema(s.thema);

    if (s.uiLang && E.uiLangSelect) E.uiLangSelect.value = s.uiLang;
    if (E.languageCodeSelect) {
      const langPart = (s.languageCode || "ALL").split(/[-_]/)[0].toUpperCase();
      E.languageCodeSelect.value = langPart;
    }
  }

  function populateLanguageSelect() {
    const el = elements.languageCodeSelect;
    if (!el) return;
    const frag = document.createDocumentFragment();
    view.availableLanguages.forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      frag.appendChild(opt);
    });
    el.replaceChildren(frag);
    const configLang = ((view.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL").toUpperCase();
    el.value = view.availableLanguages.includes(configLang) ? configLang : utils.isMobileDevice() ? "ALL" : el.value;
  }

  function populateVoiceSelect() {
    const el = elements.voiceSelect;
    if (!el) return;
    const isMobile = utils.isMobileDevice();
    const selectedLang = (elements.languageCodeSelect?.value || "ALL").toUpperCase();

    if (!view.voices || !view.voices.length) {
      el.replaceChildren();
      return;
    }

    const voicesToShow = isMobile || selectedLang === "ALL" ? view.voices : view.voices.filter((v) => (v.lang || "").toUpperCase().startsWith(selectedLang));

    const frag = document.createDocumentFragment();
    voicesToShow.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang || ""})`;
      frag.appendChild(opt);
    });
    el.replaceChildren(frag);

    let match = voicesToShow.find((v) => utils.normalizeString(v.name) === utils.normalizeString(view.settings.voiceName));
    if (!match && voicesToShow.length) match = voicesToShow[0];

    if (match && el.value !== match.name) {
      el.value = match.name;
      bus.emit(EventTypes.SETTINGS_UPDATE, { voiceName: match.name });
    }
  }

  function setLanguageCodeFromSettings() {
    const E = elements;
    const langPart = ((view.settings.languageCode || "ALL").split(/[-_]/)[0] || "ALL").toUpperCase();
    if (E.languageCodeSelect && E.languageCodeSelect.value !== langPart) {
      E.languageCodeSelect.value = langPart;
    }
  }

  function setVoiceFromSettings() {
    const E = elements;
    const voice = view.settings.voiceName;
    if (!E.voiceSelect || !voice) return;
    const opts = Array.from(E.voiceSelect.options).map((o) => o.value);
    if (opts.includes(voice) && E.voiceSelect.value !== voice) {
      E.voiceSelect.value = voice;
    }
  }

  return {
    setSelectsFromSettings,
    populateLanguageSelect,
    populateVoiceSelect,
    setLanguageCodeFromSettings,
    setVoiceFromSettings,
  };
}
