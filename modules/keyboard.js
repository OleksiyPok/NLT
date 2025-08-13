export function createKeyboard({ UI }) {
  function handleKeyControls(event) {
    const tag = document.activeElement?.tagName || "";
    const isTyping = ["INPUT", "TEXTAREA"].includes(tag);

    if (
      event.key === "Escape" ||
      event.key === "Esc" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      event.preventDefault();
      UI.elements.resetBtn?.click();
    }
    if (
      (event.key === " " ||
        event.key === "Spacebar" ||
        event.code === "Space" ||
        event.keyCode === 32) &&
      !isTyping
    ) {
      event.preventDefault();
      UI.elements.startPauseBtn?.click();
    }
  }

  function attach() {
    document.addEventListener("keydown", handleKeyControls);
  }

  return { attach };
}
