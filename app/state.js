"use strict";
export function createState() {
  return {
    appState: null,
    config: null,
    settings: null,
    voices: [],
    availableLanguages: [],
    texts: [],
    inputs: [],
    playQueue: [],
    currentIndex: 0,
    repeatsRemaining: 1
  };
}
