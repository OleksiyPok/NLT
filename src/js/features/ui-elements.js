// Elements of the page (found once by selector) and the state shared by the ui-*.js modules.
export const SELECTORS = {
  helpAppBtn: "#helpAppBtn",
  helpAppModal: "#helpAppModal",
  helpAppCloseBtn: "#helpAppCloseBtn",
  helpAppContent: "#helpAppContent",
  uiLangSelect: "#uiLangSelect",
  repeatLeft: "#repeatLeft",
  speedSelect: "#speedSelect",
  intervalSelect: "#intervalSelect",
  digitLengthSelect: "#digitLengthSelect",
  countSelect: "#countSelect",
  repeatSelect: "#repeatSelect",
  fullscreenSelect: "#fullscreenSelect",
  languageCodeSelect: "#languageCodeSelect",
  labelLanguageCode: "#labelLanguageCode",
  voiceSelect: "#voiceSelect",
  numberGrid: "#numberGrid",
  labelRepeatsText: "#labelRepeatsText",
  fillRandomBtn: "#fillRandomBtn",
  resetSettingsBtn: "#resetSettingsBtn",
  resetSettingsText: "#resetSettingsText",
  startPauseBtn: "#startPauseBtn",
  resetBtn: "#resetBtn",
  uiLangLabel: "#uiLangLabel",
  labelVoice: "#labelVoice",
  labelDigitLength: "#labelDigitLength",
  labelCount: "#labelCount",
  labelRepeat: "#labelRepeat",
  labelSpeed: "#labelSpeed",
  labelInterval: "#labelInterval",
  labelFullscreen: "#labelFullscreen",
  labelFullscreenDelayMode: "#labelFullscreenDelayMode",
  labelFullscreenDelay: "#labelFullscreenDelay",
  labelDelayTime: "#labelDelayTime",
  fullscreenDelayMode: "#fullscreenDelayMode",
  fullscreenDelay: "#fullscreenDelay",
  themaModeSelect: "#themaModeSelect",
  themaSelect: "#themaSelect",
  labelThema: "#labelThema",
  labelThemaMode: "#labelThemaMode",
  developerPanel: "#developer",
  backgroundOverlay: "#backgroundOverlay",
  activeNumberOverlay: "#activeNumberOverlay",
};

// ctx = { bus, utils, langLoader, elements, view } is passed to every ui-*.js module
export function createUiContext({ bus, utils, langLoader }) {
  return {
    bus,
    utils,
    langLoader,
    elements: {},
    // What the page shows now (kept here, not read back from the DOM)
    view: {
      inputs: [], // the number fields
      voices: [], // [{ name, lang }]
      availableLanguages: [],
      settings: { pitch: 1.0, volume: 1.0 },
      appState: "init",
      index: 0, // the number that is played now
    },
  };
}

export function cacheElements({ elements }) {
  for (const key in SELECTORS) elements[key] = document.querySelector(SELECTORS[key]) || null;
}
