export function createStateManager({ state, UI } = {}) {
  return {
    getState() {
      return state;
    },
    getAppState() {
      return state.appState;
    },
    setAppState(s) {
      state.appState = s;
      if (UI && UI.updateStartPauseButton) UI.updateStartPauseButton();
      if (UI && UI.updateControlsState) UI.updateControlsState();
    },
    is(s) {
      return state.appState === s;
    },
    getSettings() {
      return state.settings || {};
    },
    updateSettings(patch) {
      state.settings = { ...(state.settings || {}), ...patch };
    },
    replaceSettings(next) {
      state.settings = { ...next };
    },
    resetPlaybackState() {
      state.playQueue = [];
      state.currentIndex = 0;
      state.repeatsRemaining = 1;
    },
  };
}
