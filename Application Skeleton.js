// ================================
//  Application Skeleton (clean modular)
// ================================

// --- Dependency Diagram ---
/*
   UI  ---> App <--- State
    |             ^
    v             |
  Playback ----> Speaker
     ^            ^
     |            |
  Config       Storage
     ^            ^
     |            |
    Utils ------->|

- App — центральный контроллер, связывает всё.
- UI генерирует события → App.
- App обновляет State, вызывает Playback, управляет Speaker.
- Playback использует Speaker и State.
- Config, Storage, Utils — вспомогательные.
*/

// --- state.js ---
export const State = (() => {
  const data = {};
  const listeners = new Map();

  const get = (key) => (key ? data[key] : data);
  const set = (key, value) => {
    data[key] = value;
    (listeners.get(key) || []).forEach((cb) => cb(value));
  };
  const patch = (partial) =>
    Object.entries(partial).forEach(([k, v]) => set(k, v));
  const on = (key, cb) => {
    const arr = listeners.get(key) || [];
    arr.push(cb);
    listeners.set(key, arr);
  };

  return { get, set, patch, on };
})();

// --- ui.js ---
export const UI = {
  SELECTORS: {
    startBtn: "#startBtn",
    pauseBtn: "#pauseBtn",
    voiceSelect: "#voiceSelect",
    // ... add more selectors here
  },
  elements: {},
  on: {},
  init() {
    for (const k in this.SELECTORS) {
      this.elements[k] = document.querySelector(this.SELECTORS[k]);
    }
    this.attachHandlers();
  },
  attachHandlers() {
    this.elements.startBtn?.addEventListener("click", () => this.on.start?.());
    this.elements.pauseBtn?.addEventListener("click", () => this.on.pause?.());
    this.elements.voiceSelect?.addEventListener("change", (e) =>
      this.on.voiceChange?.(e.target.value)
    );
  },
  updateLabels(texts) {
    // update DOM labels
  },
  setDisabled(id, flag) {
    this.elements[id] && (this.elements[id].disabled = flag);
  },
};

// --- speaker.js ---
export const Speaker = {
  voices: [],
  currentVoice: null,
  init(voices) {
    this.voices = voices;
  },
  setVoice(name) {
    this.currentVoice = this.voices.find((v) => v.name === name) || null;
  },
  speak(text, rate = 1.0, langFallback) {
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (this.currentVoice) {
        utter.voice = this.currentVoice;
        utter.lang = this.currentVoice.lang;
      } else if (langFallback) {
        utter.lang = langFallback;
      }
      utter.rate = rate;
      utter.onend = resolve;
      utter.onerror = resolve;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    });
  },
  stop() {
    speechSynthesis.cancel();
  },
};

// --- playback.js ---
export const Playback = {
  start() {
    State.set("appState", "playing");
    // build queue, call Speaker.speak
  },
  pause() {
    Speaker.stop();
    State.set("appState", "paused");
  },
  resume() {
    State.set("appState", "playing");
  },
  stop() {
    Speaker.stop();
    State.set("appState", "ready");
  },
};

// --- config.js ---
export const Config = {
  DEFAULT_SETTINGS: {
    uiLang: "en",
    voiceName: "",
    // ...
  },
  async load() {
    // fetch config.json
  },
};

// --- storage.js ---
export const Storage = {
  save(settings) {
    localStorage.setItem("settings", JSON.stringify(settings));
  },
  load() {
    return JSON.parse(localStorage.getItem("settings") || "null");
  },
  clear() {
    localStorage.removeItem("settings");
  },
};

// --- utils.js ---
export const Utils = {
  delay: (ms) => new Promise((res) => setTimeout(res, ms)),
  safeNumber: (v, f) => (isFinite(+v) ? +v : f),
};

// --- app.js ---
import { State } from "./state.js";
import { UI } from "./ui.js";
import { Speaker } from "./speaker.js";
import { Playback } from "./playback.js";
import { Config } from "./config.js";
import { Storage } from "./storage.js";

export const App = {
  async init() {
    await Config.load();
    State.patch(Storage.load() || Config.DEFAULT_SETTINGS);

    UI.init();
    UI.on.start = () => Playback.start();
    UI.on.pause = () => Playback.pause();
    UI.on.voiceChange = (name) => Speaker.setVoice(name);

    // preload voices
    Speaker.init(speechSynthesis.getVoices());
    speechSynthesis.onvoiceschanged = () =>
      Speaker.init(speechSynthesis.getVoices());

    State.set("appState", "ready");
  },
};

// --- index.js (entrypoint) ---
import { App } from "./app.js";
App.init();
