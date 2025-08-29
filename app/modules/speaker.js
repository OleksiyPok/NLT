export const Speaker = (() => {
  let getVoices = () => [];
  let getSettings = () => ({});

  function init(voicesProvider, settingsProvider) {
    if (typeof voicesProvider === "function") getVoices = voicesProvider;
    if (typeof settingsProvider === "function") getSettings = settingsProvider;
  }

  function speak(text, options = {}) {
    if (!text) return Promise.resolve();
    const s = { ...getSettings(), ...options };

    if (options.interrupt !== false) {
      speechSynthesis.cancel();
    }

    const utter = new SpeechSynthesisUtterance(text);

    if (s.voiceName) {
      const v = getVoices().find((vv) => vv.name === s.voiceName);
      if (v) utter.voice = v;
    }

    if (s.languageCode) utter.lang = s.languageCode;

    let rate = s.rate !== undefined ? Number(s.rate) : Number(s.speed);
    utter.rate = Number.isFinite(rate) && rate > 0 ? rate : 1.0;

    let pitch = Number(s.pitch);
    utter.pitch = Number.isFinite(pitch) && pitch > 0 ? pitch : 1.0;

    let volume = Number(s.volume);
    utter.volume =
      Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1.0;

    return new Promise((resolve) => {
      const done = () => resolve();
      utter.onend = done;
      utter.onerror = done;
      speechSynthesis.speak(utter);
    });
  }

  return {
    init,
    speak,
    cancel: () => speechSynthesis.cancel(),
    pause: () => speechSynthesis.pause(),
    resume: () => speechSynthesis.resume(),
    isSpeaking: () => speechSynthesis.speaking,
    isPaused: () => speechSynthesis.paused,
  };
})();
