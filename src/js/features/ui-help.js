// Help window: the help page (docs/help/help.<lang>.html) and the language of the page.
// The help pages themselves are not changed yet.
import { HELP_DIR, HELP_LANGS, HELP_LANGUAGE_KEY } from "../core/config.js";

const APP_LANGUAGE = "app"; // "the language of the interface"
const DEFAULT_LANGUAGE = "en";

export function createUiHelp({ elements, langLoader }) {
  const pageCache = {};

  const interfaceLanguage = () => {
    const lang = elements.uiLangSelect?.value;
    return HELP_LANGS.includes(lang) ? lang : DEFAULT_LANGUAGE;
  };

  function getSavedLanguage() {
    try {
      const saved = localStorage.getItem(HELP_LANGUAGE_KEY);
      if (saved === APP_LANGUAGE || HELP_LANGS.includes(saved)) return saved;
    } catch {
      // The storage is not available: use the default.
    }
    return APP_LANGUAGE;
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(HELP_LANGUAGE_KEY, lang);
    } catch (err) {
      console.warn("Failed to save the help language:", err);
    }
  }

  async function fetchPage(lang) {
    if (pageCache[lang]) return pageCache[lang];
    const res = await fetch(`${HELP_DIR}help.${lang}.html`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`help.${lang}.html: ${res.status}`);
    pageCache[lang] = await res.text();
    return pageCache[lang];
  }

  // The page of the language; English if there is no such page; "" if nothing can be loaded
  async function getPage(lang) {
    try {
      return await fetchPage(lang);
    } catch {
      if (lang === DEFAULT_LANGUAGE) return "";
      try {
        return await fetchPage(DEFAULT_LANGUAGE);
      } catch {
        return "";
      }
    }
  }

  // The row with the language select and the place for the page
  function renderLanguageRow(target, selected) {
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");

    const label = document.createElement("span");
    label.className = "help-language-label";
    label.textContent = texts.helpLanguageLabel;

    const select = document.createElement("select");
    select.id = "helpLanguageSelect";
    select.className = "help-language-select";
    select.title = texts.helpLanguageLabel;
    select.setAttribute("aria-label", texts.helpLanguageLabel);
    select.append(new Option(texts.helpLanguageApp, APP_LANGUAGE), ...HELP_LANGS.map((code) => new Option(code.toUpperCase(), code)));
    select.value = selected;

    const row = document.createElement("div");
    row.className = "help-language-row";
    row.append(label, select);

    const page = document.createElement("div");
    page.id = "helpPageContent";

    target.replaceChildren(row, page);
    return { select, page };
  }

  async function loadHelpContent() {
    const target = elements.helpAppContent;
    if (!target) return;

    const { select, page } = renderLanguageRow(target, getSavedLanguage());
    let request = 0;

    async function showPage() {
      const current = ++request;
      const lang = select.value === APP_LANGUAGE ? interfaceLanguage() : select.value;
      const html = await getPage(lang);
      if (current !== request) return; // a newer choice has been made
      if (html) page.innerHTML = html;
      else page.textContent = langLoader.getTexts(elements.uiLangSelect?.value || "en").helpUnavailable || "";
    }

    select.addEventListener("change", () => {
      saveLanguage(select.value);
      showPage();
    });
    await showPage();
  }

  const isAppHelpModalOpen = () => !elements.helpAppModal?.classList.contains("hidden");
  const openHelpModal = () => elements.helpAppModal?.classList.remove("hidden");

  function closeHelpModal() {
    elements.helpAppModal?.classList.add("hidden");
    elements.helpAppContent?.replaceChildren();
  }

  return { isAppHelpModalOpen, loadHelpContent, openHelpModal, closeHelpModal };
}
