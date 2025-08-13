"use strict";
export function createNLTApp({
  Voices,
  Speech,
  Config,
  Utils,
  Storage,
  createUI,
  createHandlers,
  createKeyboard,
  createWakeLock,
  createApp,
  createState,
}) {
  const state = createState();
  const UI = createUI(state);
  const WakeLock = createWakeLock({ state, Config });
  const App = createApp({
    state,
    UI,
    Speech,
    Config,
    Utils,
    Storage,
    Voices,
    WakeLock,
    createHandlers,
    createKeyboard,
  });
  return { init: () => App.init(), _internal: { Config, Utils, state } };
}
