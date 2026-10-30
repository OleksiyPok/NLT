// The exercise: plays the numbers one after another (start, pause, repeat, fullscreen).
import { EventTypes } from "../core/event-types.js";

export function createPlayback({ bus, speaker, utils, wakeLock, uiProvider, config }) {
  let currentSettings = { pitch: 1.0, volume: 1.0 };
  let currentAppState = "init";
  let currentIndex = 0;
  const VISUAL_DELAY_HOLD_MS = 2000;
  const SPEECH_FIRST_UTTERANCE_MS = 200;
  const SPEECH_AFTER_WARMUP_MS = 150;
  let warmUpDoneForSession = false;

  async function holdVisualIfSameStep(idx) {
    if (currentAppState !== "playing") return;
    if (currentIndex !== idx) return;
    await utils.delay(VISUAL_DELAY_HOLD_MS);
  }

  function buildPlayQueue() {
    return uiProvider.getSelectedInputs().map((i) => ({ value: i.value, el: i }));
  }

  function resetRuntime(runtime) {
    bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
    runtime.playQueue = [];
    runtime.repeatsRemaining = utils.safeNumber(currentSettings.repeat, 1);
  }

  async function playSequence(runtime) {
    if (currentAppState !== "playing") return;

    let firstSpeakInRun = true;
    const speakDigit = async (value, opts) => {
      if (firstSpeakInRun) {
        firstSpeakInRun = false;
        await utils.delay(SPEECH_FIRST_UTTERANCE_MS);
      }
      return speaker.speak(value, opts);
    };

    while (currentAppState === "playing") {
      const intervalMs = utils.safeNumber(currentSettings.intervalMs, 500);
      const isFullscreen = String(currentSettings.fullscreen ?? "0") === "1";
      const fsMode = String(currentSettings.fullscreenDelayMode || "No delay");
      const fsDelayMs = isFullscreen ? utils.safeNumber(currentSettings.fullscreenDelay, 0) * 1000 : 0;

      if (currentIndex >= runtime.playQueue.length) {
        if (runtime.repeatsRemaining > 1) {
          runtime.repeatsRemaining -= 1;
          bus.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
          bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
        } else {
          bus.emit(EventTypes.APP_STATE_SET, "ready");
          bus.emit(EventTypes.UI_BACKGROUND_HIDE);
          bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
          resetRuntime(runtime);
          bus.emit(EventTypes.UI_HIGHLIGHT);
          wakeLock.release();
          return;
        }
      }

      const idx = currentIndex;
      const item = runtime.playQueue[idx];
      if (!item || !item.value) {
        await utils.delay(intervalMs);
        if (currentAppState !== "playing") break;
        bus.emit(EventTypes.PLAYBACK_INDEX_SET, idx + 1);
        continue;
      }

      bus.emit(EventTypes.UI_HIGHLIGHT);
      bus.emit(EventTypes.UI_BACKGROUND_SHOW);

      bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);

      if (isFullscreen && fsDelayMs > 0 && fsMode === "Audio delay") {
        bus.emit(EventTypes.UI_ACTIVE_NUMBER_SHOW, { value: item.value, delayMs: null });
        await utils.delay(fsDelayMs);
        if (currentAppState !== "playing") break;

        await speakDigit(item.value, {
          languageCode: currentSettings.languageCode || "nl-NL",
          speed: currentSettings.speed,
          pitch: currentSettings.pitch,
          volume: currentSettings.volume,
          voiceName: currentSettings.voiceName,
          interrupt: false,
        });
        await holdVisualIfSameStep(idx);
        bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
      } else if (isFullscreen && fsDelayMs > 0 && fsMode === "Visual delay") {
        const speakPromise = speakDigit(item.value, {
          languageCode: currentSettings.languageCode || "nl-NL",
          speed: currentSettings.speed,
          pitch: currentSettings.pitch,
          volume: currentSettings.volume,
          voiceName: currentSettings.voiceName,
          interrupt: false,
        });

        await utils.delay(fsDelayMs);
        if (currentAppState !== "playing") break;
        if (currentIndex === idx) {
          bus.emit(EventTypes.UI_ACTIVE_NUMBER_SHOW, { value: item.value, delayMs: null });
        }

        await speakPromise;
        await holdVisualIfSameStep(idx);
        bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
      } else {
        bus.emit(EventTypes.UI_ACTIVE_NUMBER_SHOW, { value: item.value, delayMs: null });
        await speakDigit(item.value, {
          languageCode: currentSettings.languageCode || "nl-NL",
          speed: currentSettings.speed,
          pitch: currentSettings.pitch,
          volume: currentSettings.volume,
          voiceName: currentSettings.voiceName,
          interrupt: false,
        });
        bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
      }

      if (currentAppState !== "playing") break;
      await utils.delay(intervalMs);
      if (currentAppState !== "playing") break;
      bus.emit(EventTypes.PLAYBACK_INDEX_SET, idx + 1);
    }
  }

  const runtime = { playQueue: [], repeatsRemaining: 1 };

  bus.on(EventTypes.PLAYBACK_START, async () => {
    runtime.repeatsRemaining = utils.safeNumber(currentSettings.repeat, 1);
    bus.emit(EventTypes.UI_REPEAT_LEFT_SET, runtime.repeatsRemaining);
    runtime.playQueue = buildPlayQueue();
    bus.emit(EventTypes.PLAYBACK_INDEX_SET, 0);
    bus.emit(EventTypes.APP_STATE_SET, "playing");
    bus.emit(EventTypes.UI_BACKGROUND_SHOW);
    if (!warmUpDoneForSession) {
      warmUpDoneForSession = true;
      try {
        await speaker.warmUp();
        await utils.delay(SPEECH_AFTER_WARMUP_MS);
      } catch (e) {
        console.warn("Speech warm-up failed", e);
      }
    }
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });

  bus.on(EventTypes.PLAYBACK_RESUME, () => {
    if (currentAppState === "playing") return;
    bus.emit(EventTypes.APP_STATE_SET, "playing");
    playSequence(runtime).catch((e) => console.warn("playSequence failed", e));
  });

  bus.on(EventTypes.PLAYBACK_PAUSE, () => {
    speaker.cancel();
    bus.emit(EventTypes.APP_STATE_SET, "paused");
    bus.emit(EventTypes.UI_BACKGROUND_HIDE);
    bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
  });

  bus.on(EventTypes.PLAYBACK_STOP, () => {
    speaker.cancel();
    bus.emit(EventTypes.APP_STATE_SET, "ready");
    bus.emit(EventTypes.UI_BACKGROUND_HIDE);
    bus.emit(EventTypes.UI_ACTIVE_NUMBER_HIDE);
    resetRuntime(runtime);
    bus.emit(EventTypes.UI_REPEAT_LEFT_SET, utils.safeNumber(currentSettings.repeat, 1));
    bus.emit(EventTypes.UI_HIGHLIGHT);
    wakeLock.release();
    warmUpDoneForSession = false;
  });

  bus.on(EventTypes.PLAYBACK_TOGGLE, () => {
    if (currentAppState === "playing") return bus.emit(EventTypes.PLAYBACK_PAUSE);
    if (currentAppState === "paused") return bus.emit(EventTypes.PLAYBACK_RESUME);
    bus.emit(EventTypes.PLAYBACK_START);
  });

  bus.on(EventTypes.SETTINGS_CHANGED, (s) => (currentSettings = { ...s }));
  bus.on(EventTypes.APP_STATE, (s) => (currentAppState = s));
  bus.on(EventTypes.PLAYBACK_INDEX, (i) => (currentIndex = i));

  return { buildPlayQueue };
}
