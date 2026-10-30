// Theme list and helpers. Pure functions, no DOM access except applyThemeClass.
// The class of <html> before the first paint is set by theme-boot.js (keep DEFAULT_THEME equal to "thema" in config/config.json).

export const DEFAULT_THEME = "theme-yellowblue-normal";

// Removed palettes: old saved value -> replacement (same mode)
const DEPRECATED_THEME_MAP = {
  "theme-dutchflag-contrast": "theme-delftware-contrast",
  "theme-dutchflag-normal": "theme-delftware-normal",
  "theme-dutchflag-evening": "theme-delftware-evening",
  "theme-dutchflag-night": "theme-delftware-night",
  "theme-firbrown-contrast": "theme-delftware-contrast",
  "theme-firbrown-normal": "theme-delftware-normal",
  "theme-firbrown-evening": "theme-delftware-evening",
  "theme-firbrown-night": "theme-delftware-night",
};

export const THEME_DEFS = [
  { value: "theme-oceanamber-contrast", label: "Ocean Amber - Contrast" },
  { value: "theme-oceanamber-normal", label: "Ocean Amber - Normal" },
  { value: "theme-oceanamber-evening", label: "Ocean Amber - Evening" },
  { value: "theme-oceanamber-night", label: "Ocean Amber - Night" },
  { value: "theme-yellowblue-contrast", label: "Yellow Blue - Contrast" },
  { value: "theme-yellowblue-normal", label: "Yellow Blue - Normal" },
  { value: "theme-yellowblue-evening", label: "Yellow Blue - Evening" },
  { value: "theme-yellowblue-night", label: "Yellow Blue - Night" },
  { value: "theme-skycoral-contrast", label: "Sky Coral - Contrast" },
  { value: "theme-skycoral-normal", label: "Sky Coral - Normal" },
  { value: "theme-skycoral-evening", label: "Sky Coral - Evening" },
  { value: "theme-skycoral-night", label: "Sky Coral - Night" },
  { value: "theme-malachite-contrast", label: "Malachite - Contrast" },
  { value: "theme-malachite-normal", label: "Malachite - Normal" },
  { value: "theme-malachite-evening", label: "Malachite - Evening" },
  { value: "theme-malachite-night", label: "Malachite - Night" },
  { value: "theme-warmorange-contrast", label: "Warm Orange - Contrast" },
  { value: "theme-warmorange-normal", label: "Warm Orange - Normal" },
  { value: "theme-warmorange-evening", label: "Warm Orange - Evening" },
  { value: "theme-warmorange-night", label: "Warm Orange - Night" },
  { value: "theme-amberglow-contrast", label: "Amber Glow - Contrast" },
  { value: "theme-amberglow-normal", label: "Amber Glow - Normal" },
  { value: "theme-amberglow-evening", label: "Amber Glow - Evening" },
  { value: "theme-amberglow-night", label: "Amber Glow - Night" },
  { value: "theme-delftware-contrast", label: "Delftware - Contrast" },
  { value: "theme-delftware-normal", label: "Delftware - Normal" },
  { value: "theme-delftware-evening", label: "Delftware - Evening" },
  { value: "theme-delftware-night", label: "Delftware - Night" },
  { value: "theme-tropical-contrast", label: "Tropical / Caribbean - Contrast" },
  { value: "theme-tropical-normal", label: "Tropical / Caribbean - Normal" },
  { value: "theme-tropical-evening", label: "Tropical / Caribbean - Evening" },
  { value: "theme-tropical-night", label: "Tropical / Caribbean - Night" },
  { value: "theme-grayscale-contrast", label: "Grayscale - Contrast" },
  { value: "theme-grayscale-normal", label: "Grayscale - Normal" },
  { value: "theme-grayscale-evening", label: "Grayscale - Evening" },
  { value: "theme-grayscale-night", label: "Grayscale - Night" },
  { value: "theme-autumnforest-contrast", label: "Autumn Forest - Contrast" },
  { value: "theme-autumnforest-normal", label: "Autumn Forest - Normal" },
  { value: "theme-autumnforest-evening", label: "Autumn Forest - Evening" },
  { value: "theme-autumnforest-night", label: "Autumn Forest - Night" },
];

export const THEME_VALUES = THEME_DEFS.map((x) => x.value);

// Order must stay in sync with <select id="themaModeSelect"> option values
export const THEME_MODES = Object.freeze(["contrast", "normal", "evening", "night"]);

export function resolveThemaKey(value) {
  const s = String(value || "");
  return DEPRECATED_THEME_MAP[s] || s;
}

// "theme-skycoral-night" -> { palette: "skycoral", mode: "night" }
export function parseThema(value) {
  const v = String(value || "");
  if (!v.startsWith("theme-")) return null;
  for (const mode of THEME_MODES) {
    const suffix = "-" + mode;
    if (v.length > suffix.length && v.endsWith(suffix)) {
      const palette = v.slice("theme-".length, v.length - suffix.length);
      if (palette) return { palette, mode };
    }
  }
  return null;
}

export function composeThema(palette, mode) {
  const p = String(palette || "");
  const m = String(mode || "");
  if (!p || !THEME_MODES.includes(m)) return null;
  const candidate = `theme-${p}-${m}`;
  return THEME_VALUES.includes(candidate) ? candidate : null;
}

// One entry per palette: { palette, label } (the label without the " - Mode" part), sorted by label
export function getPaletteOptions() {
  const seen = new Set();
  const out = [];
  THEME_DEFS.forEach((def) => {
    const parsed = parseThema(def.value);
    if (!parsed || seen.has(parsed.palette)) return;
    seen.add(parsed.palette);
    const sep = def.label.indexOf(" - ");
    out.push({ palette: parsed.palette, label: sep >= 0 ? def.label.slice(0, sep).trim() : def.label });
  });
  return out.sort((a, b) => a.label.localeCompare(b.label, "en"));
}

// Puts the wanted theme class on <html> (unknown value -> fallback) and returns the chosen one
export function applyThemeClass(htmlEl, value, fallback = DEFAULT_THEME) {
  const wanted = resolveThemaKey(value);
  const chosen = THEME_VALUES.includes(wanted) ? wanted : fallback;
  // Also removes a theme class that is not in the list (set early by theme-boot.js)
  [...htmlEl.classList].filter((c) => c.startsWith("theme-")).forEach((c) => htmlEl.classList.remove(c));
  htmlEl.classList.add(chosen);
  return chosen;
}
