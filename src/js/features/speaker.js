// Speech synthesis: speaks one text with the chosen voice and speed.
export function createSpeaker({ bus, voicesProvider, settingsProvider } = {}) {
  const emitter = bus;
  let getVoices = () => (typeof voicesProvider === "function" ? voicesProvider() : []);
  let getSettings = () => (typeof settingsProvider === "function" ? settingsProvider() : {});
  let currentUtterance = null;

  function init(voicesProv, settingsProv) {
    if (typeof voicesProv === "function") getVoices = voicesProv;
    if (typeof settingsProv === "function") getSettings = settingsProv;
  }

  function _selectVoice(s) {
    const voices = getVoices() || [];
    if (!voices.length) return null;
    const desiredName = String(s.voiceName || "").trim();
    const desiredLang = String(s.languageCode || "")
      .trim()
      .toLowerCase();

    if (desiredName) {
      let exact = voices.find((v) => v.name === desiredName);
      if (exact) return exact;
      const norm = (n) =>
        String(n || "")
          .trim()
          .toLowerCase();
      let partial = voices.find((v) => norm(v.name).includes(norm(desiredName)));
      if (partial) return partial;
    }

    if (desiredLang) {
      const langFull = desiredLang;
      let byFull = voices.find((v) => (v.lang || "").toLowerCase() === langFull);
      if (byFull) return byFull;
      const base = langFull.split(/[-_]/)[0];
      if (base) {
        let byBase = voices.find((v) => (v.lang || "").toLowerCase().startsWith(base));
        if (byBase) return byBase;
      }
    }

    const navigatorBase = (navigator.language || "").split(/[-_]/)[0];
    if (navigatorBase) {
      const navMatch = voices.find((v) => (v.lang || "").toLowerCase().startsWith(navigatorBase));
      if (navMatch) return navMatch;
    }

    return voices[0] || null;
  }

  async function speakAsync(text, options = {}) {
    if (!text) return;
    const settings = (typeof getSettings === "function" ? getSettings() : {}) || {};
    const s = { ...settings, ...options };
    if (options.interrupt !== false) speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(String(text));
    const chosen = _selectVoice(s);

    if (chosen) {
      try {
        utter.voice = chosen;
        utter.lang = chosen.lang || s.languageCode || utter.lang || "";
      } catch (e) {
        if (s.languageCode) utter.lang = s.languageCode;
      }
    } else {
      if (s.languageCode) utter.lang = s.languageCode;
    }

    const rate = Number.isFinite(Number(s.rate ?? s.speed)) && Number(s.rate ?? s.speed) > 0 ? Number(s.rate ?? s.speed) : 1.0;
    const pitch = Number.isFinite(Number(s.pitch)) && Number(s.pitch) > 0 ? Number(s.pitch) : 1.0;
    const volume = Number.isFinite(Number(s.volume)) && Number(s.volume) >= 0 && Number(s.volume) <= 1 ? Number(s.volume) : 1.0;

    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    return new Promise((resolve) => {
      const done = () => {
        currentUtterance = null;
        emitter?.emit?.("speech:end", { button: options.button || null });
        resolve();
      };
      utter.onend = done;
      utter.onerror = done;
      currentUtterance = utter;
      emitter?.emit?.("speech:start", { button: options.button || null });
      speechSynthesis.speak(utter);
    });
  }

  function speak(obj) {
    if (!obj) return;
    if (typeof obj === "string") {
      return speakAsync(obj).catch((e) => console.warn("speak failed", e));
    }
    const { text, rate = 1, lang, button, voiceName, pitch, volume } = obj;
    return speakAsync(text, {
      rate,
      languageCode: lang,
      speed: rate,
      voiceName,
      pitch,
      volume,
      button,
    }).catch((e) => console.warn("speak failed", e));
  }

  function cancel() {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    if (currentUtterance) {
      emitter?.emit?.("speech:end", { button: null });
      currentUtterance = null;
    }
  }

  async function warmUp() {
    try {
      try {
        speechSynthesis.cancel();
      } catch (_) {}
      speechSynthesis.resume();
    } catch (_) {}
    const settings = (typeof getSettings === "function" ? getSettings() : {}) || {};
    const utter = new SpeechSynthesisUtterance(".");
    const chosen = _selectVoice(settings);
    if (chosen) {
      try {
        utter.voice = chosen;
        utter.lang = chosen.lang || settings.languageCode || utter.lang || "";
      } catch (_) {
        if (settings.languageCode) utter.lang = settings.languageCode;
      }
    } else if (settings.languageCode) {
      utter.lang = settings.languageCode;
    }
    utter.rate = 1.2;
    utter.pitch = 1;
    utter.volume = 0.01;
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve();
      };
      const t = setTimeout(finish, 800);
      utter.onend = finish;
      utter.onerror = finish;
      speechSynthesis.speak(utter);
    });
  }

  const pause = () => {
    try {
      speechSynthesis.pause();
    } catch (_) {}
  };
  const resume = () => {
    try {
      speechSynthesis.resume();
    } catch (_) {}
  };
  const isSpeaking = () => speechSynthesis.speaking;
  const isPaused = () => speechSynthesis.paused;

  return {
    init,
    speak,
    speakAsync,
    warmUp,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
  };
}
