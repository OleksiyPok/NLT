function updateViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

window.addEventListener("resize", updateViewportHeight);
window.addEventListener("orientationchange", updateViewportHeight);
window.addEventListener("load", updateViewportHeight);

const PATHS = {
  CONFIG: "script/config.json",
  // UI_TEXTS: "script/ui_texts.json",
};

const DEFAULT_CONFIG = {
  DEVELOPER_MODE: false, // If TRUE Button "Clear LS" and "Path" will be visible.
  USE_LOCAL_STORAGE: true,
  mobile: {
    DEFAULT_SETTINGS: {
      uiLang: "en",
      digitLength: "2",
      count: "40",
      repeat: "1",
      delay: "500",
      speed: "1.0",
      languageCode: "nl-NL",
      voiceName: "Google Nederlands",
    },
  },
  desktop: {
    DEFAULT_SETTINGS: {
      uiLang: "en",
      digitLength: "2",
      count: "40",
      repeat: "1",
      delay: "500",
      speed: "1.0",
      languageCode: "nl-NL",
      voiceName: "Google Nederlands",
    },
  },
  ENUMS: {
    AppStates: {
      INIT: "init",
      READY: "ready",
      PLAYING: "playing",
      PAUSED: "paused",
    },
  },
};

let CONFIG = structuredClone(DEFAULT_CONFIG);

// === Global State ===
const state = {
  appState: CONFIG.ENUMS.AppStates.INIT,
  settings: {},
  texts: {},
  voices: [],
  availableLanguages: [],
  inputs: [],
  playQueue: [],
  currentIndex: 0,
  repeatsRemaining: 1,
};

// === UI Selectors ===
const UI = {
  resetSettingsBtn: document.getElementById("resetSettingsBtn"),
  defaultBtn: document.getElementById("defaultBtn"),
  repeatSelect: document.getElementById("repeatSelect"),
  repeatLeft: document.getElementById("repeatLeft"),
  delaySelect: document.getElementById("delaySelect"),
  speedSelect: document.getElementById("speedSelect"),
  uiLangSelect: document.getElementById("uiLangSelect"),
  languageCodeSelect: document.querySelector(".language-code-select"),
  labelLanguageCode: document.querySelector(".label-language-code"),
  voiceSelect: document.getElementById("voiceSelect"),
  digitLengthSelect: document.getElementById("digitLengthSelect"),
  countSelect: document.getElementById("countSelect"),
  numberGrid: document.getElementById("numberGrid"),
  fillRandomBtn: document.getElementById("fillRandomBtn"),
  startPauseBtn: document.getElementById("startPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  uiLangLabel: document.getElementById("uiLangLabel"),
  labelVoice: document.getElementById("labelVoice"),
  labelDigitLength: document.getElementById("labelDigitLength"),
  labelCount: document.getElementById("labelCount"),
  labelRepeat: document.getElementById("labelRepeat"),
  labelSpeed: document.getElementById("labelSpeed"),
  labelDelay: document.getElementById("labelDelay"),
  labelRepeatsText: document.getElementById("labelRepeatsText"),
  developerPanel: document.getElementById("developer"),
};

const MOBILE_REGEX =
  /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

// === Utilities ===
function isMobileDevice() {
  if (navigator.userAgentData) {
    return navigator.userAgentData.mobile;
  }
  return MOBILE_REGEX.test(navigator.userAgent);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setAppState(newState) {
  state.appState = newState;
  updateStartPauseButton();
  updateControlsState();
}

// === Settings ===
function getDefaultSettings() {
  return isMobileDevice()
    ? { ...CONFIG.mobile.DEFAULT_SETTINGS }
    : { ...CONFIG.desktop.DEFAULT_SETTINGS };
}

function saveSettingsToLocalStorage() {
  localStorage.setItem("settings", JSON.stringify(state.settings));
}

function loadSettingsFromLocalStorage() {
  const saved = localStorage.getItem("settings");
  return saved ? JSON.parse(saved) : null;
}

function updateSettingsFromUI() {
  state.settings.digitLength =
    UI.digitLengthSelect.value || state.settings.digitLength;
  state.settings.count = UI.countSelect.value || state.settings.count;
  state.settings.repeat = UI.repeatSelect.value || state.settings.repeat;
  state.settings.uiLang = UI.uiLangSelect.value || state.settings.uiLang;
  state.settings.languageCode =
    UI.languageCodeSelect?.value || state.settings.languageCode;
  state.settings.voiceName = UI.voiceSelect?.value || state.settings.voiceName;
  state.settings.speed = UI.speedSelect.value || state.settings.speed;
  state.settings.delay = UI.delaySelect.value || state.settings.delay;
  saveSettingsToLocalStorage();
}

function resetRepeatLeft() {
  UI.repeatLeft.textContent = UI.repeatSelect.value;
  updateControlsState();
}

function setSelectValueWithFallback(selectElem, value, fallbackValue) {
  const options = Array.from(selectElem.options).map((opt) => opt.value);
  const finalValue = options.includes(value) ? value : fallbackValue;

  if (!options.includes(value)) {
    console.warn(
      `Value ‘${value}’ is missing in the selector ‘${selectElem.id}’. Set the fallback value ‘${fallbackValue}’`
    );
  }

  selectElem.value = finalValue;
  return finalValue;
}

async function resetToDefaultSettings() {
  speechSynthesis.cancel();
  stopPlayback();

  state.settings = getDefaultSettings();

  setSelectValueWithFallback(
    UI.digitLengthSelect,
    String(state.settings.digitLength),
    "2"
  );
  setSelectValueWithFallback(
    UI.countSelect,
    String(state.settings.count),
    "10"
  );
  setSelectValueWithFallback(
    UI.repeatSelect,
    String(state.settings.repeat),
    "1"
  );
  setSelectValueWithFallback(
    UI.speedSelect,
    String(state.settings.speed),
    "1.0"
  );
  setSelectValueWithFallback(
    UI.delaySelect,
    String(state.settings.delay),
    "500"
  );

  if (UI.uiLangSelect) {
    UI.uiLangSelect.value = state.settings.uiLang;
  }

  if (UI.languageCodeSelect) {
    populateLanguageSelect();
    const langShort = (state.settings.languageCode || "ALL")
      .split(/[-_]/)[0]
      .toUpperCase();
    UI.languageCodeSelect.value = langShort;
    await delay(0);
    populateVoiceSelect();
  }

  if (UI.voiceSelect) {
    UI.voiceSelect.value = state.settings.voiceName;
  }

  saveSettingsToLocalStorage();
  updateInterfaceLanguage();
  fillRandom();
  highlightSelection();
  resetRepeatLeft();
}

// === Configuration Loading ===
window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();

  state.settings = CONFIG.USE_LOCAL_STORAGE
    ? loadSettingsFromLocalStorage() || getDefaultSettings()
    : getDefaultSettings();

  const safeNumber = (val, fallback) => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  state.settings.digitLength = safeNumber(
    setSelectValueWithFallback(
      UI.digitLengthSelect,
      String(state.settings.digitLength),
      "2"
    ),
    2
  );

  state.settings.count = safeNumber(
    setSelectValueWithFallback(
      UI.countSelect,
      String(state.settings.count),
      "10"
    ),
    10
  );

  state.settings.repeat = safeNumber(
    setSelectValueWithFallback(
      UI.repeatSelect,
      String(state.settings.repeat),
      "1"
    ),
    1
  );

  state.settings.speed = safeNumber(
    setSelectValueWithFallback(
      UI.speedSelect,
      String(state.settings.speed),
      "1.0"
    ),
    1.0
  );

  state.settings.delay = safeNumber(
    setSelectValueWithFallback(
      UI.delaySelect,
      String(state.settings.delay),
      "500"
    ),
    500
  );

  if (state.settings.uiLang) {
    UI.uiLangSelect.value = state.settings.uiLang;
  }

  await loadUiTexts();
  setAppState(CONFIG.ENUMS.AppStates.READY);
  await loadVoices();
  if (isMobileDevice()) setupMobileDefaults();

  state.inputs = Array.from(
    UI.numberGrid.querySelectorAll("input[type='text']")
  );

  // createGrid();
  populateLanguageSelect();
  populateVoiceSelect();
  fillRandom();
  highlightSelection();
  updateInterfaceLanguage();
  attachEventHandlers();

  UI.resetBtn.addEventListener("click", fullReset);
  UI.startPauseBtn.disabled = false;
  resetRepeatLeft();

  if (UI.developerPanel) {
    UI.developerPanel.style.display = CONFIG.DEVELOPER_MODE ? "block" : "none";
    UI.developerPanel.style.marginLeft = CONFIG.DEVELOPER_MODE ? "auto" : "";
  }
});

async function loadConfig() {
  try {
    const res = await fetch(PATHS.CONFIG);
    if (res.ok) {
      const externalConfig = await res.json();
      CONFIG = structuredClone(DEFAULT_CONFIG);
      Object.assign(
        CONFIG.mobile.DEFAULT_SETTINGS,
        externalConfig.mobile?.DEFAULT_SETTINGS
      );
      Object.assign(
        CONFIG.desktop.DEFAULT_SETTINGS,
        externalConfig.desktop?.DEFAULT_SETTINGS
      );
      if (typeof externalConfig.DEVELOPER_MODE === "boolean") {
        CONFIG.DEVELOPER_MODE = externalConfig.DEVELOPER_MODE;
      }

      if (typeof externalConfig.USE_LOCAL_STORAGE === "boolean") {
        CONFIG.USE_LOCAL_STORAGE = externalConfig.USE_LOCAL_STORAGE;
      }
      alert("Using external config");
      console.log("📦 CONFIG external:", CONFIG);
    } else {
      alert("Using internal config");
      console.log("📦 CONFIG inside:", CONFIG);
    }
  } catch (e) {
    console.warn("Using fallbackValue for config due to error:", e);
  }
}

function setupMobileDefaults() {
  [UI.languageCodeSelect, UI.labelLanguageCode].forEach(
    (el) => el && (el.style.display = "none")
  );
}

async function loadUiTexts() {
  // try {
  if (window.embeddedUITexts) {
    state.texts = window.embeddedUITexts;
    updateInterfaceLanguage();
    return;
  }
  //   const res = await fetch(PATHS.UI_TEXTS);
  //   if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
  //   state.texts = await res.json();
  // } catch (e) {
  //   console.error("Failed to load UI texts", e);
  //   state.texts = {};
  // }
}

async function loadVoices() {
  for (let i = 0; i < 3 && !state.voices.length; i++) {
    await delay(300);
    state.voices = speechSynthesis.getVoices();
  }
  if (!state.voices.length) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    await delay(300);
    state.voices = speechSynthesis.getVoices();
  }
  const shortLangs = state.voices.map((v) =>
    v.lang.split("-")[0].toUpperCase()
  );
  state.availableLanguages = Array.from(new Set(shortLangs))
    .sort()
    .concat("ALL");
}

function populateLanguageSelect() {
  if (!UI.languageCodeSelect) return;
  const fragment = document.createDocumentFragment();
  state.availableLanguages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    fragment.appendChild(option);
  });
  UI.languageCodeSelect.innerHTML = "";
  UI.languageCodeSelect.appendChild(fragment);

  const configLang = state.settings.languageCode.split(/[-_]/)[0].toLowerCase();
  if (state.availableLanguages.some((l) => l.toLowerCase() === configLang)) {
    UI.languageCodeSelect.value = configLang.toUpperCase();
  } else if (isMobileDevice()) {
    UI.languageCodeSelect.value = "ALL";
  }
}

function populateVoiceSelect() {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .trim();

  if (!state.voices || state.voices.length === 0) return;

  UI.voiceSelect.innerHTML = "";

  const isMobile = isMobileDevice();

  // On mobile, show all voices; on desktop, filter by the language selected
  const selectedLang = UI.languageCodeSelect.value.toUpperCase();
  const voicesToShow =
    isMobile || selectedLang === "ALL"
      ? state.voices
      : state.voices.filter((v) =>
          v.lang.toUpperCase().startsWith(selectedLang)
        );

  const fragment = document.createDocumentFragment();
  voicesToShow.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    fragment.appendChild(option);
  });
  UI.voiceSelect.appendChild(fragment);

  const requestedLang = normalize(state.settings.languageCode || "");
  const requestedVoice = normalize(state.settings.voiceName || "");

  let match;

  if (isMobile) {
    // On mobile, try to find a voice with lang === the configured language
    match = voicesToShow.find((v) => normalize(v.lang) === requestedLang);
  } else {
    // On desktop, look for the voice by name (original logic)
    match = voicesToShow.find((v) => normalize(v.name) === requestedVoice);
  }

  // If the voice is not found, fall back to the first in the list
  if (!match && voicesToShow.length > 0) {
    match = voicesToShow[0];
  }

  if (match) {
    UI.voiceSelect.value = match.name;
    state.settings.voiceName = match.name;
  }
}
// === Event Handlers ===

function attachEventHandlers() {
  UI.uiLangSelect.addEventListener("change", () => {
    updateInterfaceLanguage();
    updateSettingsFromUI();
  });
  if (!isMobileDevice()) {
    UI.languageCodeSelect.addEventListener("change", () => {
      populateVoiceSelect();
      updateSettingsFromUI();
    });
  }
  UI.voiceSelect.addEventListener("change", updateSettingsFromUI);
  UI.digitLengthSelect.addEventListener("change", () => {
    updateSettingsFromUI();
    fillRandom();
    highlightSelection();
  });
  UI.countSelect.addEventListener("change", () => {
    updateSettingsFromUI();
    highlightSelection();
  });

  UI.repeatSelect.addEventListener("change", () => {
    updateSettingsFromUI();
    resetRepeatLeft();
  });

  UI.speedSelect.addEventListener("change", updateSettingsFromUI);
  UI.delaySelect.addEventListener("change", updateSettingsFromUI);

  UI.fillRandomBtn.addEventListener("click", () => {
    fillRandom();
    highlightSelection();
  });

  if (UI.resetSettingsBtn) {
    UI.resetSettingsBtn.addEventListener("click", resetToDefaultSettings);
  }
  if (UI.defaultBtn) {
    UI.defaultBtn.addEventListener("click", resetToDefaultSettings);
  }
}

// === Number Grid ===
// function createGrid() {
//   UI.numberGrid.innerHTML = "";
//   state.inputs = [];

//   for (let col = 0; col < 4; col++) {
//     const column = document.createElement("div");
//     column.classList.add("column");
//     for (let row = 0; row < 10; row++) {
//       const input = document.createElement("input");
//       input.type = "text";
//       input.className = "number-input";
//       input.placeholder = "***";
//       input.maxLength = state.settings.digitLength;
//       input.readOnly = true;
//       input.tabIndex = -1;
//       input.style.userSelect = "none";
//       input.style.caretColor = "transparent";
//       input.style.pointerEvents = "none";
//       column.appendChild(input);
//       state.inputs.push(input);
//     }
//     UI.numberGrid.appendChild(column);
//   }
// }

function fillRandom() {
  const maxValue = 10 ** state.settings.digitLength - 1;
  state.inputs.forEach((input) => {
    input.value = Math.floor(Math.random() * (maxValue + 1)).toString();
  });
}

function highlightSelection() {
  const { count } = state.settings;
  state.inputs.forEach((input, idx) => {
    input.classList.toggle("selected", idx < count);
    input.classList.toggle("highlight", idx === state.currentIndex);
  });
}

// === Interface ===
function updateInterfaceLanguage() {
  updateUILabels();
}

function updateUILabels() {
  const texts = state.texts[UI.uiLangSelect.value];
  if (!texts) return;

  UI.uiLangLabel.textContent = texts.uiLangLabel;
  UI.labelLanguageCode.textContent = texts.labelLang;
  UI.labelVoice.textContent = texts.labelVoice;
  UI.labelDigitLength.textContent = texts.labelDigitLength;
  UI.labelCount.textContent = texts.labelCount;
  UI.labelRepeat.textContent = texts.labelRepeat;
  UI.labelSpeed.textContent = texts.labelSpeed;
  UI.labelDelay.textContent = texts.labelDelay;
  UI.labelRepeatsText.textContent = texts.repeatsLeft;
  UI.fillRandomBtn.textContent = texts.fillRandom;
  UI.resetBtn.textContent = texts.reset;

  if (UI.defaultBtn && texts.default) {
    UI.defaultBtn.textContent = texts.default;
  }

  updateStartPauseButton();
  updateControlsState();
}

function updateStartPauseButton() {
  const texts = state.texts[UI.uiLangSelect.value];
  if (!texts) return;
  const labels = {
    [CONFIG.ENUMS.AppStates.PLAYING]: texts.pause,
    [CONFIG.ENUMS.AppStates.PAUSED]: texts.continue,
    [CONFIG.ENUMS.AppStates.READY]: texts.start,
  };
  UI.startPauseBtn.textContent = labels[state.appState] || texts.start;
}

// === Playback ===

async function togglePlay() {
  if (state.appState === CONFIG.ENUMS.AppStates.PLAYING) {
    // Pause requested
    speechSynthesis.cancel();
    setAppState(CONFIG.ENUMS.AppStates.PAUSED);
    return;
  }

  if (state.appState === CONFIG.ENUMS.AppStates.PAUSED) {
    // Continue from paused state
    setAppState(CONFIG.ENUMS.AppStates.PLAYING);
    playSequence(true); // true = resume
    return;
  }

  // Start new playback
  state.repeatsRemaining = Number(UI.repeatSelect.value) || 1;
  UI.repeatLeft.textContent = state.repeatsRemaining;
  state.playQueue = state.inputs.filter((input) =>
    input.classList.contains("selected")
  );
  state.currentIndex = 0;

  setAppState(CONFIG.ENUMS.AppStates.PLAYING);
  playSequence(false);
}

function playSequence(isResume = false) {
  if (state.appState !== CONFIG.ENUMS.AppStates.PLAYING) return;

  if (state.currentIndex >= state.playQueue.length) {
    if (state.repeatsRemaining > 1) {
      state.repeatsRemaining--;
      UI.repeatLeft.textContent = state.repeatsRemaining;
      state.currentIndex = 0;
    } else {
      stopPlayback();
      return;
    }
  }

  const input = state.playQueue[state.currentIndex];
  if (!input || !input.value) {
    state.currentIndex++;
    setTimeout(() => playSequence(false), Number(UI.delaySelect.value) || 500);
    return;
  }

  highlightSelection();

  const utterance = new SpeechSynthesisUtterance(input.value);

  const selectedVoiceName = UI.voiceSelect.value;
  const selectedVoice = state.voices.find((v) => v.name === selectedVoiceName);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = state.settings.languageCode || "nl-NL";
  }

  utterance.rate = state.settings.speed || 1.0;

  utterance.onend = () => {
    if (state.appState === CONFIG.ENUMS.AppStates.PLAYING) {
      state.currentIndex++;
      setTimeout(
        () => playSequence(false),
        Number(UI.delaySelect.value) || 500
      );
    }
  };

  speechSynthesis.cancel();

  setTimeout(() => {
    if (state.appState === CONFIG.ENUMS.AppStates.PLAYING) {
      speechSynthesis.speak(utterance);
    }
  }, 100);
}

function stopPlayback() {
  speechSynthesis.cancel();
  setAppState(CONFIG.ENUMS.AppStates.READY);
  state.currentIndex = 0;
  state.playQueue = [];
  state.repeatsRemaining = Number(UI.repeatSelect.value) || 1;
  resetRepeatLeft();
  highlightSelection();
}

function updateControlsState() {
  const disable = state.appState === CONFIG.ENUMS.AppStates.PLAYING;

  const isInitialState =
    state.appState === CONFIG.ENUMS.AppStates.READY &&
    state.currentIndex === 0 &&
    Number(UI.repeatLeft.textContent) === Number(UI.repeatSelect.value);

  const disableCountRepeat = !isInitialState;
  const disableDigitLength = !isInitialState;

  // Disable main controls during playback
  [UI.languageCodeSelect, UI.voiceSelect].forEach(
    (el) => (el.disabled = disable)
  );

  [UI.labelLanguageCode, UI.labelVoice].forEach((label) =>
    label?.classList.toggle("disabled", disable)
  );

  // Only allow fillRandomBtn in initial state
  UI.fillRandomBtn.disabled = !isInitialState;

  // Disable count & repeat selection outside of initial state
  [UI.countSelect, UI.repeatSelect].forEach((el) => {
    if (el) el.disabled = disableCountRepeat;
  });
  [UI.labelCount, UI.labelRepeat].forEach((label) => {
    if (label) label.classList.toggle("disabled", disableCountRepeat);
  });

  // Disable digit length selection outside of initial state
  if (UI.digitLengthSelect) {
    UI.digitLengthSelect.disabled = disableDigitLength;
  }
  if (UI.labelDigitLength) {
    UI.labelDigitLength.classList.toggle("disabled", disableDigitLength);
  }

  // Reset button enabled only if paused and progress exists
  UI.resetBtn.disabled = !(
    state.appState === CONFIG.ENUMS.AppStates.PAUSED && !isInitialState
  );
}

function fullReset() {
  speechSynthesis.cancel();
  stopPlayback();
}
