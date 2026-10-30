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

  // The mode icon comes from the SVG sprite in index.html; the app sets its title later.
  function setInitialModeIcon() {
    var icon = document.getElementById("themaModeIcon");
    if (!icon) return;

    var match = theme.match(/-(contrast|normal|evening|night)$/);
    var mode = match ? match[1] : "normal";

    icon.innerHTML =
      '<svg aria-hidden="true"><use href="#i-mode-' + mode + '" /></svg>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setInitialModeIcon, {
      once: true,
    });
  } else {
    setInitialModeIcon();
  }
})();
