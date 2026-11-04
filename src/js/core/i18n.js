// UI texts and language names: src/i18n/<lang>.json = { ui: {...}, languages: {...} }.
// English is always loaded and used as the fallback.
export function createLangLoader({ config }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};

  const FALLBACK_EN = { ui: {}, languages: {} };

  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      console.warn(`UI texts load failed for ${code}:`, e);
      return null;
    }
  }

  // The languages to load: the given list, by default config.UI_LANGS
  async function loadAll(allowed = config.UI_LANGS) {
    texts = {};
    const langs = Array.isArray(allowed) ? allowed : ["en"];
    await Promise.all(
      langs.map(async (code) => {
        const data = await loadLang(code);
        if (data) texts[code] = data;
      }),
    );
    if (!texts.en) {
      texts.en = FALLBACK_EN;
      console.warn("EN fallback injected.");
    }
    return texts;
  }

  // Texts of the language; a text missing in it is taken from English.
  const getTexts = (lang) => ({ ...(texts.en || FALLBACK_EN).ui, ...texts[lang]?.ui });
  const getLanguageNames = (lang) => ({ ...(texts.en || FALLBACK_EN).languages, ...texts[lang]?.languages });

  return { loadLang, loadAll, getTexts, getLanguageNames };
}
