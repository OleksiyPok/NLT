// List of the voices of the browser.
export function createVoices({ bus }) {
  let voices = [];
  let availableLanguages = [];
  const emitter = bus;

  function computeAvailableLanguages() {
    availableLanguages = Array.from(new Set(voices.map((v) => (v.lang || "").split(/[-_]/)[0].toUpperCase()).filter(Boolean))).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
  }

  function publish(evt) {
    const lightweight = voices.map((v) => ({ name: v.name, lang: v.lang }));
    emitter?.emit?.(evt, {
      voices: lightweight,
      availableLanguages: availableLanguages.slice(),
    });
  }

  function collect() {
    voices = speechSynthesis.getVoices() || [];
    computeAvailableLanguages();
    publish("voices:changed");
  }

  async function load() {
    collect();
    if (!voices.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await new Promise((r) => setTimeout(r, 250));
        collect();
      } catch (err) {
        console.warn("Voices.load fallback failed", err);
      }
    }
    publish("voices:loaded");
  }

  if ("onvoiceschanged" in speechSynthesis) speechSynthesis.onvoiceschanged = () => collect();

  return {
    collect,
    load,
    getVoices: () => voices.slice(),
    getAvailableLanguages: () => availableLanguages.slice(),
  };
}
