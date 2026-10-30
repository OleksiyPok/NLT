// Names of the events of the event bus.
export const EventTypes = Object.freeze({
  APP_STATE: "app:state",
  APP_STATE_SET: "app:state:set",
  APP_SETTINGS_RESET: "app:settings:resetToDefault",
  APP_FULL_RESET: "app:fullReset",

  UI_BACKGROUND_SHOW: "ui:background:show",
  UI_BACKGROUND_HIDE: "ui:background:hide",
  UI_ACTIVE_NUMBER_SHOW: "ui:activeNumber:show",
  UI_ACTIVE_NUMBER_HIDE: "ui:activeNumber:hide",
  UI_HIGHLIGHT: "ui:highlight",
  UI_REPEAT_LEFT_SET: "ui:repeatLeft:set",
  UI_TEXTS_UPDATE: "ui:texts:update",

  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",

  PLAYBACK_START: "playback:start",
  PLAYBACK_RESUME: "playback:resume",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_TOGGLE: "playback:toggle",
  PLAYBACK_INDEX: "playback:currentIndex",
  PLAYBACK_INDEX_SET: "playback:currentIndex:set",

  UI_HELP_MODAL_OPEN: "ui:helpModal:open",
  UI_HELP_MODAL_CLOSE: "ui:helpModal:close",
  UI_SETTINGS_MODAL_OPEN: "ui:settingsModal:open",
  UI_SETTINGS_MODAL_CLOSE: "ui:settingsModal:close",

  SETTINGS_CHANGED: "settings:changed",
  SETTINGS_UPDATE: "settings:update",
});
