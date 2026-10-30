// Help window: loads docs/help/help.<lang>.html (the help pages are not changed yet).

export function createUiHelp({ elements }) {


  function isAppHelpModalOpen() {
    return !elements.helpAppModal?.classList.contains("hidden");
  }

  function loadHelpContent() {
    const el = elements.helpAppContent;
    if (!el) return;

    const currentLang = elements.uiLangSelect?.value || "en";
    loadHelpContentLang(currentLang);
  }

  function loadHelpContentLang(lang) {
    const el = elements.helpAppContent;
    if (!el) return;

    const load = (code) =>
      fetch(`docs/help/help.${code}.html`).then((r) => {
        if (!r.ok) throw new Error(`Help file not found: ${code}`);
        return r.text();
      });

    load(lang)
      .then((html) => {
        el.innerHTML = html;
        el.dataset.loaded = "1";
      })
      .catch((e) => {
        console.warn(`Help lang load failed (${lang}), fallback to EN`, e);

        if (lang === "en") return;

        load("en")
          .then((html) => {
            el.innerHTML = html;
            el.dataset.loaded = "1";
          })
          .catch((err) => console.warn("Help fallback EN failed", err));
      });
  }

  function openHelpModal() {
    elements.helpAppModal?.classList.remove("hidden");
  }

  function closeHelpModal() {
    elements.helpAppModal?.classList.add("hidden");

    if (elements.helpAppContent) {
      elements.helpAppContent.innerHTML = "";
      elements.helpAppContent.dataset.loaded = "0";
    }
  }

  return {
    isAppHelpModalOpen,
    loadHelpContent,
    openHelpModal,
    closeHelpModal,
  };
}
