// Settings window: the same settings as on the main page (copies, see ui-mirrors.js).
export function createModals({ elements, mirrors }) {
  const isSettingsModalOpen = () =>
    !elements.settingsAppModal?.classList.contains("hidden");

  function openSettingsModal() {
    mirrors.sync();
    elements.settingsAppModal?.classList.remove("hidden");
  }

  const closeSettingsModal = () =>
    elements.settingsAppModal?.classList.add("hidden");

  return { isSettingsModalOpen, openSettingsModal, closeSettingsModal };
}

// An open window owns one history entry, so the "Back" button of the browser / phone closes the window
// first (back to the main page) and only the next "Back" leaves the page. Without a window Back works as usual.
// Closing with the cross, the backdrop or Esc also removes the history entry.
export function createModalHistory({ isAnyOpen, closeAll }) {
  let pushed = false;

  // "Back" pressed while a window is open: the entry is already gone, just hide the window.
  window.addEventListener("popstate", () => {
    if (!pushed) return;
    pushed = false;
    closeAll();
  });

  return {
    opened() {
      if (pushed) return;
      history.pushState({ appModal: true }, "");
      pushed = true;
    },
    closed() {
      if (!pushed || isAnyOpen()) return;
      pushed = false;
      history.back();
    },
  };
}
