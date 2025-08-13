"use strict";

import { AppStates } from "../app/appStates.js";
export const Speech = {
  state: null,
  utils: null,
  ui: null,
  wakeLock: null,

  init(stateRef, utilsRef, uiRef, wakeLockRef) {
    this.state = stateRef;
    this.utils = utilsRef;
    this.ui = uiRef;
    this.wakeLock = wakeLockRef;
  },

  buildPlayQueue() {
    this.state.playQueue = this.state.inputs.filter((i) =>
      i.classList.contains("selected")
    );
  },

  stopPlayback() {
    speechSynthesis.cancel();
    this.state.appState = this.state.config.ENUMS.AppStates.READY;
    this.ui.updateStartPauseButton();
    this.ui.hideBackgroundOverlay();
    this.state.currentIndex = 0;
    this.state.playQueue = [];
    this.state.repeatsRemaining = this.utils.safeNumber(
      this.ui.elements.repeatSelect?.value,
      1
    );
    this.ui.resetRepeatLeft();
    this.ui.highlightSelection();
    this.wakeLock.release();
  },

  speakUtterance(utter) {
    return new Promise((resolve) => {
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      speechSynthesis.cancel();
      if (!window.userActivated) return; /// TODO
      speechSynthesis.speak(utter);
    });
  },

  async playSequence(isResume = false) {
    await this.wakeLock.request();
    if (this.state.appState !== this.state.config.ENUMS.AppStates.PLAYING)
      return;
    const delayMs = this.utils.safeNumber(
      this.ui.elements.delaySelect?.value,
      500
    );

    while (this.state.appState === this.state.config.ENUMS.AppStates.PLAYING) {
      if (this.state.currentIndex >= this.state.playQueue.length) {
        if (this.state.repeatsRemaining > 1) {
          this.state.repeatsRemaining -= 1;
          if (this.ui.elements.repeatLeft) {
            this.ui.elements.repeatLeft.textContent = String(
              this.state.repeatsRemaining
            );
          }
          this.state.currentIndex = 0;
        } else {
          this.stopPlayback();
          return;
        }
      }

      const input = this.state.playQueue[this.state.currentIndex];
      if (!input || !input.value) {
        this.state.currentIndex += 1;
        await this.utils.delay(delayMs);
        continue;
      }

      this.ui.highlightSelection();
      this.ui.showBackgroundOverlay();
      this.ui.showActiveNumberOverlay(input.value, delayMs);

      const utter = new SpeechSynthesisUtterance(input.value);
      const selectedVoiceName = this.ui.elements.voiceSelect?.value;
      const selectedVoice = this.state.voices.find(
        (v) => v.name === selectedVoiceName
      );
      if (selectedVoice) {
        utter.voice = selectedVoice;
        utter.lang = selectedVoice.lang;
      } else {
        utter.lang = this.state.settings.languageCode || "nl-NL";
      }
      utter.rate = Number(this.state.settings.speed) || 1.0;

      await this.speakUtterance(utter);

      if (this.state.appState !== this.state.config.ENUMS.AppStates.PLAYING)
        break;
      this.state.currentIndex += 1;
      await this.utils.delay(delayMs);
    }
  },

  togglePlay() {
    if (this.state.appState === this.state.config.ENUMS.AppStates.PLAYING) {
      speechSynthesis.cancel();
      this.state.appState = this.state.config.ENUMS.AppStates.PAUSED;
      this.ui.hideBackgroundOverlay();
      this.ui.hideActiveNumberOverlay();
      return;
    }
    if (this.state.appState === this.state.config.ENUMS.AppStates.PAUSED) {
      this.state.appState = this.state.config.ENUMS.AppStates.PLAYING;
      this.playSequence(true).catch((e) =>
        console.warn("playSequence failed", e)
      );
      this.ui.hideBackgroundOverlay();
      this.ui.hideActiveNumberOverlay();
      return;
    }
    this.state.repeatsRemaining = this.utils.safeNumber(
      this.ui.elements.repeatSelect?.value,
      1
    );
    if (this.ui.elements.repeatLeft) {
      this.ui.elements.repeatLeft.textContent = String(
        this.state.repeatsRemaining
      );
    }
    this.buildPlayQueue();
    this.state.currentIndex = 0;
    this.state.appState = this.state.config.ENUMS.AppStates.PLAYING;
    this.ui.showBackgroundOverlay();
    this.playSequence(false).catch((e) =>
      console.warn("playSequence failed", e)
    );
  },
};
