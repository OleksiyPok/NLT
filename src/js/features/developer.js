// Secret gesture: 7 quick clicks on the "Reset defaults" text show the developer panel
// for 30 seconds (whatever the saved "developerMode" is).
import { EventTypes } from "../core/event-types.js";

const GESTURE_CLICKS = 7;
const GESTURE_WINDOW_MS = 3000;
const TEMPORARY_VISIBLE_MS = 30_000;

export function createDeveloper({ bus, ui, store }) {
  let clicks = [];
  let hideTimer = null;

  function showPanel(visible) {
    const panel = ui.elements.developerPanel;
    if (panel) panel.style.display = visible ? "flex" : "none";
  }

  function showTemporarily() {
    bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
    showPanel(true);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => showPanel(Boolean(store.getSettings().developerMode)), TEMPORARY_VISIBLE_MS);
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

  function init() {
    document.getElementById("resetSettingsText")?.addEventListener("click", onClick);
  }

  return { init };
}
