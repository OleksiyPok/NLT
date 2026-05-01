"use strict";

(function initThemeRegistry(global) {
  var DEFAULT_THEME = "theme-yellowblue-normal";
  var THEME_DEFS = [
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
    { value: "theme-firbrown-contrast", label: "Fir Brown - Contrast" },
    { value: "theme-firbrown-normal", label: "Fir Brown - Normal" },
    { value: "theme-firbrown-evening", label: "Fir Brown - Evening" },
    { value: "theme-firbrown-night", label: "Fir Brown - Night" },
  ];

  var THEME_VALUES = THEME_DEFS.map(function (x) {
    return x && x.value ? String(x.value) : "";
  }).filter(Boolean);

  function applyThemeClass(htmlEl, value, fallback) {
    var safeFallback = fallback || DEFAULT_THEME;
    var wanted = String(value || "");
    var chosen = THEME_VALUES.indexOf(wanted) >= 0 ? wanted : safeFallback;
    if (!htmlEl) return chosen;
    for (var i = 0; i < THEME_VALUES.length; i++) htmlEl.classList.remove(THEME_VALUES[i]);
    htmlEl.classList.add(chosen);
    return chosen;
  }

  global.NLTThemeRegistry = Object.freeze({
    defaultTheme: DEFAULT_THEME,
    themes: Object.freeze(THEME_DEFS.slice()),
    themeValues: Object.freeze(THEME_VALUES.slice()),
    applyThemeClass: applyThemeClass,
  });

  // Early apply saved theme to avoid flash.
  try {
    var raw = global.localStorage ? global.localStorage.getItem("NLT-settings") : null;
    var parsed = raw ? JSON.parse(raw) : null;
    var wanted = parsed && parsed.thema ? String(parsed.thema) : "";
    var html = global.document && global.document.documentElement;
    applyThemeClass(html, wanted, DEFAULT_THEME);
  } catch (_e) {}
})(window);
