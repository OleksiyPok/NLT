// Theme in the page: the palette and mode selects and the class of <html>.
import { DEFAULT_THEME, THEME_MODES, THEME_VALUES, applyThemeClass, composeThema, getPaletteOptions, parseThema, resolveThemaKey } from "../core/theme-registry.js";

export function createUiTheme({ utils, elements, langLoader }) {
  const fallbackParsed = parseThema(DEFAULT_THEME);

  function renderThemeSelectOptions() {
    const select = elements.themaSelect;
    if (!select) return;
    select.replaceChildren(
      ...getPaletteOptions().map(({ palette, label }) => {
        const option = document.createElement("option");
        option.value = palette;
        option.textContent = label;
        return option;
      })
    );
  }

  // A valid full theme name for any saved value
  function resolveCanonicalThema(raw) {
    const resolved = resolveThemaKey(raw);
    if (THEME_VALUES.includes(resolved)) return resolved;
    const parsed = parseThema(resolved);
    return (parsed && composeThema(parsed.palette, parsed.mode)) || DEFAULT_THEME;
  }

  // Icon and title of the mode button of the top row
  function updateModeButton() {
    const button = elements.themaModeBtn;
    const icon = elements.themaModeIcon;
    const mode = elements.themaModeSelect?.value;
    if (!button || !icon || !mode) return;
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    const title = `${texts.labelThemaMode}: ${texts["themaMode" + mode[0].toUpperCase() + mode.slice(1)] || ""}`;
    icon.innerHTML = `<svg aria-hidden="true"><use href="#i-mode-${mode}" /></svg>`;
    button.title = title;
    button.setAttribute("aria-label", title);
  }

  // The button: the next mode in the list (the select of the settings is changed too)
  function nextThemaMode() {
    const select = elements.themaModeSelect;
    if (!select) return;
    select.value = THEME_MODES[(THEME_MODES.indexOf(select.value) + 1) % THEME_MODES.length];
  }

  function syncThemeSelectorsFromThema(fullThema) {
    const parsed = parseThema(fullThema);
    if (!parsed) return;
    if (elements.themaSelect) utils.safeSetSelectValue(elements.themaSelect, parsed.palette, fallbackParsed.palette);
    if (elements.themaModeSelect) utils.safeSetSelectValue(elements.themaModeSelect, parsed.mode, fallbackParsed.mode);
    updateModeButton();
  }

  function applyThemeFromSettings(settings) {
    const chosen = applyThemeClass(document.documentElement, settings?.thema, DEFAULT_THEME);
    syncThemeSelectorsFromThema(chosen);
  }

  // The theme chosen in the selects (null if they are not complete)
  function getThemaFromSelects() {
    return composeThema(elements.themaSelect?.value, elements.themaModeSelect?.value);
  }

  return { updateModeButton, nextThemaMode, renderThemeSelectOptions, resolveCanonicalThema, syncThemeSelectorsFromThema, applyThemeFromSettings, getThemaFromSelects };
}
