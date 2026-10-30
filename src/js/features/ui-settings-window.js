// Settings window (still empty: the settings block is on the main page for now).
export function createUiSettingsWindow({ elements }) {
  const isSettingsModalOpen = () => !elements.settingsAppModal?.classList.contains("hidden");
  const openSettingsModal = () => elements.settingsAppModal?.classList.remove("hidden");
  const closeSettingsModal = () => elements.settingsAppModal?.classList.add("hidden");

  return { isSettingsModalOpen, openSettingsModal, closeSettingsModal };
}
