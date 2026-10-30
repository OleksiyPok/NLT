// Entry point: creates the modules and connects them.

import { createConfig } from "./core/config.js";
import { createEventBus } from "./core/event-bus.js";
import { createLangLoader } from "./core/i18n.js";
import { createStore } from "./core/store.js";
import { Utils } from "./core/utils.js";
import { createApp } from "./features/app.js";
import { createUI } from "./features/ui.js";
import { createPlayback } from "./features/playback.js";
import { createSpeaker } from "./features/speaker.js";
import { createVoices } from "./features/voices.js";
import { createWakeLock } from "./features/wake-lock.js";

const bus = createEventBus();
const Config = createConfig();
const LangLoader = createLangLoader({ config: Config });
const Store = createStore({ bus: bus });
const WakeLock = createWakeLock({ bus: bus });
const Speaker = createSpeaker();
const UI = createUI({
  bus: bus,
  utils: Utils,
  config: Config,
  langLoader: LangLoader,
});
const Voices = createVoices({ bus: bus });
createPlayback({
  bus: bus,
  speaker: Speaker,
  utils: Utils,
  wakeLock: WakeLock,
  uiProvider: UI,
  config: Config,
});
const App = createApp({
  bus: bus,
  config: Config,
  langLoader: LangLoader,
  store: Store,
  ui: UI,
  voices: Voices,
  speaker: Speaker,
  wakeLock: WakeLock,
  utils: Utils,
});

App.init();
