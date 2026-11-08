// Theme in the page: the palette and mode selects, the mode button and the class of <html>.
import {
  DEFAULT_THEME,
  THEME_MODES,
  THEME_VALUES,
  applyThemeClass,
  composeThema,
  getPaletteOptions,
  parseThema,
  resolveThemaKey,
} from "../core/theme-registry.js";
import { initLiveSelect, refreshLiveLists } from "./live-select.js";

export function createTheme({ elements, langLoader }) {
  const fallbackParsed = parseThema(DEFAULT_THEME);

  const setSelectValue = (select, value, fallback) => {
    if (!select) return;
    const has = (v) => Array.from(select.options).some((o) => o.value === v);
    select.value = has(value) ? value : fallback;
  };

  function renderThemeSelectOptions() {
    const select = elements.themaSelect;
    if (!select) return;
    select.replaceChildren(
      ...getPaletteOptions().map(({ palette, label }) => {
        const option = document.createElement("option");
        option.value = palette;
        option.textContent = label;
        return option;
      }),
    );
    // The lists of the theme and the mode apply every choice at once (see live-select.js)
    ["themaSelect", "themaModeSelect"].forEach(initLiveSelect);
    refreshLiveLists();
  }

  // Texts of the mode options and the title of the mode button
  function updateLabels(texts) {
    const modeSelect = elements.themaModeSelect;
    if (modeSelect) {
      Array.from(modeSelect.options).forEach((option) => {
        const text =
          texts[
            "themaMode" + option.value[0].toUpperCase() + option.value.slice(1)
          ];
        if (text) option.textContent = text;
      });
    }
    updateModeButton();
    refreshLiveLists();
  }

  // Icon and title of the mode button
  function updateModeButton() {
    const button = elements.themaModeBtn;
    const icon = elements.themaModeIcon;
    const mode = elements.themaModeSelect?.value;
    if (!button || !icon || !mode) return;
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    const title = `${texts.themaModeLabel || "Mode"}: ${texts["themaMode" + mode[0].toUpperCase() + mode.slice(1)] || ""}`;
    icon.innerHTML = `<svg aria-hidden="true"><use href="#i-mode-${mode}" /></svg>`;
    button.title = title;
    button.setAttribute("aria-label", title);
  }

  // The button: the next mode in the list (the mode select is changed too)
  function nextThemaMode() {
    const select = elements.themaModeSelect;
    if (!select) return;
    select.value =
      THEME_MODES[(THEME_MODES.indexOf(select.value) + 1) % THEME_MODES.length];
    refreshLiveLists();
  }

  function syncSelectsFromThema(fullThema) {
    const parsed = parseThema(fullThema);
    if (!parsed) return;
    setSelectValue(
      elements.themaSelect,
      parsed.palette,
      fallbackParsed.palette,
    );
    setSelectValue(elements.themaModeSelect, parsed.mode, fallbackParsed.mode);
    updateModeButton();
    refreshLiveLists();
  }

  // A valid full theme name for any saved value
  function resolveCanonicalThema(raw) {
    const resolved = resolveThemaKey(raw);
    if (THEME_VALUES.includes(resolved)) return resolved;
    const parsed = parseThema(resolved);
    return (
      (parsed && composeThema(parsed.palette, parsed.mode)) || DEFAULT_THEME
    );
  }

  // Puts the saved theme on <html> and into the selects
  function applyThemeFromSettings(settings) {
    const chosen = applyThemeClass(
      document.documentElement,
      settings?.thema,
      DEFAULT_THEME,
    );
    syncSelectsFromThema(chosen);
  }

  // The theme chosen in the selects (null if they are not complete)
  function getThemaFromSelects() {
    return composeThema(
      elements.themaSelect?.value,
      elements.themaModeSelect?.value,
    );
  }

  // The selects were changed by the user: the class of <html> follows them
  function applyThemeFromSelects() {
    const thema = getThemaFromSelects();
    if (thema) applyThemeClass(document.documentElement, thema, DEFAULT_THEME);
    updateModeButton();
  }

  return {
    renderThemeSelectOptions,
    updateLabels,
    updateModeButton,
    nextThemaMode,
    resolveCanonicalThema,
    syncSelectsFromThema,
    applyThemeFromSettings,
    applyThemeFromSelects,
    getThemaFromSelects,
  };
}
