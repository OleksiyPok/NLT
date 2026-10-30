"use strict";

// Applies the saved theme before the first paint (config.json is not loaded yet at this point).
// DEFAULT_THEME must be the same as "thema" in config/config.json.
(function () {
  var STORAGE_KEY = "NLT-settings";
  var DEFAULT_THEME = "theme-yellowblue-normal";
  var THEME_PATTERN = /^theme-[a-z]+-(contrast|normal|evening|night)$/;

  var theme = DEFAULT_THEME;

  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    var saved = raw ? JSON.parse(raw) : null;
    var candidate = saved && saved.thema ? String(saved.thema) : "";

    if (THEME_PATTERN.test(candidate)) {
      theme = candidate;
    }
  } catch (_e) {
    // Keep the default theme if saved settings cannot be read.
  }

  var html = document.documentElement;

  Array.from(html.classList).forEach(function (name) {
    if (name.indexOf("theme-") === 0) {
      html.classList.remove(name);
    }
  });

  html.classList.add(theme);
})();
