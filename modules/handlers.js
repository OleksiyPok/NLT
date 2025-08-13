"use strict";

export function createHandlers(deps) {
  const { UI, App, Speech, Config, Utils, WakeLock, state } = deps;
  return {
onUiLangChange() {
      UI.updateUILabels();
      UI.updateSettingsFromUI();
    },
    onLanguageCodeChange() {
      UI.populateVoiceSelect();
      UI.updateSettingsFromUI();
    },
    onVoiceChange() {
      UI.updateSettingsFromUI();
    },
    onDigitLengthChange() {
      UI.fillRandom();
      UI.highlightSelection();
    },
    onCountChange() {
      UI.highlightSelection();
    },
    onRepeatChange() {
      UI.resetRepeatLeft();
    },
    onSpeedChange() {
      UI.updateSettingsFromUI();
    },
    onDelayChange() {
      UI.updateSettingsFromUI();
    },
    onFillRandomClick() {
      UI.fillRandom();
      UI.highlightSelection();
    },
    onFullscreenChange() {
      UI.updateControlsState();
    },
    onResetSettingsClick() {
      App.resetToDefaultSettings();
    },
    onStartPauseClick() {
      Speech.togglePlay(state, UI, Config, Utils, WakeLock);
      UI.updateStartPauseButton();
      UI.updateControlsState();
    },
    onResetClick() {
      Speech.stopPlayback(state, UI, Config, Utils, WakeLock);
      UI.updateStartPauseButton();
      UI.updateControlsState();
    },
  };
}
