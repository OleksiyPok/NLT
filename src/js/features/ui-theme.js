// Theme in the page: the palette and mode selects and the class of <html>.
import { DEFAULT_THEME, THEME_VALUES, applyThemeClass, composeThema, getPaletteOptions, parseThema, resolveThemaKey } from "../core/theme-registry.js";

export function createUiTheme({ utils, elements }) {
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

  function syncThemeSelectorsFromThema(fullThema) {
    const parsed = parseThema(fullThema);
    if (!parsed) return;
    if (elements.themaSelect) utils.safeSetSelectValue(elements.themaSelect, parsed.palette, fallbackParsed.palette);
    if (elements.themaModeSelect) utils.safeSetSelectValue(elements.themaModeSelect, parsed.mode, fallbackParsed.mode);
  }

  function applyThemeFromSettings(settings) {
    const chosen = applyThemeClass(document.documentElement, settings?.thema, DEFAULT_THEME);
    syncThemeSelectorsFromThema(chosen);
  }

  // The theme chosen in the selects (null if they are not complete)
  function getThemaFromSelects() {
    return composeThema(elements.themaSelect?.value, elements.themaModeSelect?.value);
  }

  return { renderThemeSelectOptions, resolveCanonicalThema, syncThemeSelectorsFromThema, applyThemeFromSettings, getThemaFromSelects };
}
