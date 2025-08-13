export function createStateManager({ state, UI } = {}) {
  const s = state || {};
  function getState() {
    return s;
  }
  function getAppState() {
    return s.appState;
  }
  function setAppState(v) {
    if (s) s.appState = v;
    if (UI && UI.updateStartPauseButton) UI.updateStartPauseButton();
    if (UI && UI.updateControlsState) UI.updateControlsState();
  }
  function is(v) {
    return s && s.appState === v;
  }
  function getSettings() {
    return (s && s.settings) || {};
  }
  function updateSettings(patch) {
    if (s) s.settings = { ...(s.settings || {}), ...patch };
  }
  function replaceSettings(next) {
    if (s) s.settings = { ...next };
  }
  function resetPlaybackState() {
    if (s) {
      s.playQueue = [];
      s.currentIndex = 0;
      s.repeatsRemaining = 1;
    }
  }
  return {
    getState,
    getAppState,
    setAppState,
    is,
    getSettings,
    updateSettings,
    replaceSettings,
    resetPlaybackState,
  };
}
