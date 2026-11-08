// Secret gesture: 7 quick clicks on the "Reset defaults" text show the developer panel
// for 30 seconds (whatever the saved "developerMode" is).
import { STORAGE_KEY } from "../core/config.js";
import { EventTypes } from "../core/event-types.js";

const GESTURE_CLICKS = 7;
const GESTURE_WINDOW_MS = 3000;
const TEMPORARY_VISIBLE_MS = 30_000;

export function createDeveloper({ bus, ui }) {
  let savedMode = false;
  let clicks = [];
  let hideTimer = null;

  function showPanel(visible) {
    ui.setDeveloperVisibility({ developerMode: visible });
  }

  function showTemporarily() {
    bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
    showPanel(true);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => showPanel(savedMode), TEMPORARY_VISIBLE_MS);
  }

  function onClick() {
    const now = Date.now();
    clicks = clicks.filter((t) => now - t < GESTURE_WINDOW_MS);
    clicks.push(now);
    if (clicks.length >= GESTURE_CLICKS) {
      clicks = [];
      showTemporarily();
    }
  }

  // The two buttons of the developer row
  function setupButtons() {
    document
      .getElementById("developerPathBtn")
      ?.addEventListener("click", () => alert(location.href));
    document
      .getElementById("developerClearBtn")
      ?.addEventListener("click", () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        alert(`${STORAGE_KEY} cleared`);
      });
  }

  function init(appCfg) {
    savedMode = Boolean(appCfg?.developerMode);
    setupButtons();
    // The text in the settings window
    document
      .getElementById("resetSettingsText")
      ?.addEventListener("click", onClick);
  }

  return { init };
}
