"use strict";

export const Voices = {
  state: null,
  utils: null,
  ui: null,

  init(stateRef, utilsRef, uiRef) {
    this.state = stateRef;
    this.utils = utilsRef;
    this.ui = uiRef;
  },

  collect() {
    const voices = speechSynthesis.getVoices() || [];
    this.state.voices = voices;
    this.state.availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => (v.lang || "").split("-")[0].toUpperCase())
          .filter(Boolean)
      )
    ).sort();
    if (!this.state.availableLanguages.includes("ALL")) {
      this.state.availableLanguages.push("ALL");
    }
  },

  async load() {
    this.collect();
    if (!this.state.voices.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await this.utils.delay(250);
        this.collect();
      } catch (e) {
        console.warn("Voice fallback failed", e);
      }
    }
  },

  onVoicesChanged() {
    this.collect();
    this.ui.populateLanguageSelect();
    this.ui.populateVoiceSelect();
  },
};
