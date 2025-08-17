/**
 * Speaker module – reusable TTS wrapper around Web Speech API
 *
 * Usage:
 *   Speaker.speak("Hello world", { rate: 1.2, pitch: 0.9 })
 *     .then(() => console.log("Speech finished"));
 */

const Speaker = {
  lastUtterance: null,

  /**
   * Speak text with given options
   * @param {string} text - text to speak
   * @param {Object} options - voice configuration
   * @returns {Promise} resolves when speech ends or errors
   */
  speak(text, options = {}) {
    if (!text) return Promise.resolve();

    const voices = speechSynthesis.getVoices();
    const s = { ...options };

    // Interrupt option (default true)
    const interrupt =
      options.interrupt !== undefined ? options.interrupt : true;
    if (interrupt) {
      speechSynthesis.cancel();
    }

    const utter = new SpeechSynthesisUtterance(text);

    // Voice
    if (s.voiceName) {
      const v = voices.find((v) => v.name === s.voiceName);
      if (v) utter.voice = v;
    }

    // Language
    if (s.languageCode) utter.lang = s.languageCode;

    // Rate (speed)
    let rate = s.rate !== undefined ? Number(s.rate) : Number(s.speed);
    utter.rate = Number.isFinite(rate) && rate > 0 ? rate : 1.0;

    // Pitch
    let pitch = Number(s.pitch);
    utter.pitch = Number.isFinite(pitch) && pitch > 0 ? pitch : 1.0;

    // Volume
    let volume = Number(s.volume);
    utter.volume =
      Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1.0;

    this.lastUtterance = utter;

    return new Promise((resolve) => {
      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };

      // Wire callbacks, but always resolve on end/error
      const proxy =
        (userFn, doneAlso = false) =>
        (ev) => {
          try {
            if (typeof userFn === "function") userFn(ev);
          } catch (e) {
            /* ignore */
          }
          if (doneAlso) done();
        };

      utter.onstart = proxy(options.onstart, false);
      utter.onpause = proxy(options.onpause, false);
      utter.onresume = proxy(options.onresume, false);
      utter.onend = proxy(options.onend, true);
      utter.onerror = proxy(options.onerror, true);

      speechSynthesis.speak(utter);
    });
  },

  /**
   * Stop any ongoing speech immediately
   */
  stop() {
    speechSynthesis.cancel();
    this.lastUtterance = null;
  },
};
