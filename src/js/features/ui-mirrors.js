// Copies of controls: the same setting on the main page and in the settings window.
// A copy has data-mirror-of="<id of the original>". The original keeps all the logic.

export function createUiMirrors() {
  const pairs = () => Array.from(document.querySelectorAll("[data-mirror-of]")).map((copy) => [document.getElementById(copy.dataset.mirrorOf), copy]);

  // Original -> copy: options, value, disabled state, text, classes
  function sync() {
    for (const [orig, copy] of pairs()) {
      if (!orig) continue;
      if (orig.tagName === "SELECT") {
        const same = orig.options.length === copy.options.length && Array.from(orig.options).every((o, i) => o.value === copy.options[i].value && o.textContent === copy.options[i].textContent);
        if (!same) copy.replaceChildren(...Array.from(orig.options).map((o) => o.cloneNode(true)));
        if (copy.value !== orig.value) copy.value = orig.value;
        if (copy.disabled !== orig.disabled) copy.disabled = orig.disabled;
      } else {
        if (copy.textContent !== orig.textContent) copy.textContent = orig.textContent;
        copy.classList.toggle("disabled", orig.classList.contains("disabled"));
      }
    }
  }

  // Copy -> original: the original handles the change as if the user changed it
  function attach() {
    for (const [orig, copy] of pairs()) {
      if (!orig || orig.tagName !== "SELECT") continue;
      copy.addEventListener("change", () => {
        orig.value = copy.value;
        orig.dispatchEvent(new Event("change"));
        sync();
      });
    }
    sync();
  }

  return { attach, sync };
}
