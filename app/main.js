"use strict";

import { Voices } from "../modules/voices.js";
import { Speech } from "../modules/speech.js";
import { Config } from "../modules/config.js";
import { Utils } from "../modules/utils.js";
import { Storage } from "../modules/storage.js";
import { createUI } from "../modules/ui.js";
import { createHandlers } from "../modules/handlers.js";
import { createKeyboard } from "../modules/keyboard.js";
import { createWakeLock } from "../modules/wakelock.js";
import { createApp } from "./app.js";

const NLTApp = (() => {
  const state = {
    appState: null,
    settings: {},
    texts: {},
    voices: [],
    availableLanguages: [],
    inputs: [],
    playQueue: [],
    currentIndex: 0,
    repeatsRemaining: 1,
  };

  const UI = createUI(state);
  const WakeLock = createWakeLock({ state, Config });
  const App = createApp({ state, UI, Speech, Config, Utils, Storage, Voices, WakeLock, createHandlers, createKeyboard });

  return { init: () => App.init(), _internal: { Config, Utils, state } };
})();

NLTApp.init();
