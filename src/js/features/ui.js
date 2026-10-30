// The page: connects the ui-*.js modules, the controls of the settings and the events of the bus.
import { EventTypes } from "../core/event-types.js";
import { createUiHelp } from "./ui-help.js";
import { createUiLabels } from "./ui-labels.js";
import { createUiNumbers } from "./ui-numbers.js";
import { cacheElements, createUiContext } from "./ui-elements.js";
import { createUiSelects } from "./ui-selects.js";
import { createUiSettingsWindow } from "./ui-settings-window.js";
import { createUiTheme } from "./ui-theme.js";

export function createUI({ bus, utils, langLoader }) {
  const ctx = createUiContext({ bus, utils, langLoader });
  // The texts changed: the title of the mode button follows them
  ctx.onLabelsUpdated = () => theme.updateModeButton();
  const { elements, view } = ctx;

  const theme = createUiTheme(ctx);
  const help = createUiHelp(ctx);
  const labels = createUiLabels(ctx);
  const numbers = createUiNumbers(ctx, labels);
  const selects = createUiSelects(ctx, theme);
  const settingsWindow = createUiSettingsWindow(ctx);

  const { isAppHelpModalOpen, loadHelpContent, openHelpModal, closeHelpModal } = help;
  const { isSettingsModalOpen, openSettingsModal, closeSettingsModal } = settingsWindow;
  const { updateUILabels, updateStartPauseButton, updateControlsState } = labels;
  const { cacheInputs, getInputs, getSelectedInputs, showBackgroundOverlay, hideBackgroundOverlay, showActiveNumberOverlay, hideActiveNumberOverlay, resetRepeatLeft, fillRandom, highlightSelection } = numbers;
  const { setSelectsFromSettings, populateLanguageSelect, populateVoiceSelect, setLanguageCodeFromSettings, setVoiceFromSettings } = selects;

  function cache() {
    cacheElements(ctx);
    theme.renderThemeSelectOptions();
  }

  function updateSettingsFromUI() {
    const E = elements;
    const s = {};
    const upd = (key, el, fallback) => {
      if (el) s[key] = el.value || fallback;
    };
    upd("digitLength", E.digitLengthSelect, view.settings.digitLength);
    upd("count", E.countSelect, view.settings.count);
    upd("repeat", E.repeatSelect, view.settings.repeat);
    upd("uiLang", E.uiLangSelect, view.settings.uiLang);
    upd("languageCode", E.languageCodeSelect, view.settings.languageCode);
    upd("voiceName", E.voiceSelect, view.settings.voiceName);
    upd("speed", E.speedSelect, view.settings.speed);
    upd("intervalMs", E.intervalSelect, view.settings.intervalMs);
    upd("fullscreen", E.fullscreenSelect, view.settings.fullscreen);
    upd("fullscreenDelayMode", E.fullscreenDelayMode, view.settings.fullscreenDelayMode);
    upd("fullscreenDelay", E.fullscreenDelay, view.settings.fullscreenDelay);
    s.thema = theme.getThemaFromSelects() || view.settings.thema;
    bus.emit(EventTypes.SETTINGS_UPDATE, s);
  }

  function attachEventHandlers() {
    const E = elements;

    E.uiLangSelect?.addEventListener("change", () => {
      updateUILabels();
      updateSettingsFromUI();

      if (isAppHelpModalOpen()) {
        loadHelpContent();
      }
    });

    if (!utils.isMobileDevice()) {
      E.languageCodeSelect?.addEventListener("change", () => {
        const selectedLang = E.languageCodeSelect.value;
        let newSettings = { languageCode: selectedLang };
        populateVoiceSelect();
        const selectedVoice = E.voiceSelect?.value || null;
        if (selectedVoice) newSettings.voiceName = selectedVoice;
        bus.emit(EventTypes.SETTINGS_UPDATE, newSettings);
        setVoiceFromSettings();
      });
    }

    E.voiceSelect?.addEventListener("change", () => updateSettingsFromUI());

    E.digitLengthSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      fillRandom();
      highlightSelection();
    });

    E.countSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      highlightSelection();
    });

    E.repeatSelect?.addEventListener("change", () => {
      updateSettingsFromUI();
      resetRepeatLeft();
    });

    E.speedSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.intervalSelect?.addEventListener("change", () => updateSettingsFromUI());

    E.fillRandomBtn?.addEventListener("click", () => {
      fillRandom();
      highlightSelection();
    });

    E.fullscreenSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.fullscreenDelayMode?.addEventListener("change", () => updateSettingsFromUI());
    E.fullscreenDelay?.addEventListener("change", () => updateSettingsFromUI());
    E.themaSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.themaModeSelect?.addEventListener("change", () => updateSettingsFromUI());
    E.themaModeBtn?.addEventListener("click", () => {
      theme.nextThemaMode();
      updateSettingsFromUI();
    });
    E.resetSettingsBtn?.addEventListener("click", () => bus.emit(EventTypes.APP_SETTINGS_RESET));
    E.startPauseBtn?.addEventListener("click", () => bus.emit(EventTypes.PLAYBACK_TOGGLE));
    E.resetBtn?.addEventListener("click", () => bus.emit(EventTypes.APP_FULL_RESET));
    E.helpAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_OPEN));
    E.helpAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_CLOSE));
    E.settingsAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_OPEN));
    E.settingsAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE));
    E.settingsAppModal?.addEventListener("click", (e) => {
      if (e.target === E.settingsAppModal) bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    });
    E.helpAppModal?.addEventListener("click", (e) => {
      if (e.target === elements.helpAppModal) {
        bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
      }
    });
  }

  function bindEventSubscriptions() {
    bus.on(EventTypes.UI_HELP_MODAL_OPEN, () => {
      loadHelpContent();
      openHelpModal();
    });
    bus.on(EventTypes.UI_HELP_MODAL_CLOSE, closeHelpModal);
    bus.on(EventTypes.UI_SETTINGS_MODAL_OPEN, openSettingsModal);
    bus.on(EventTypes.UI_SETTINGS_MODAL_CLOSE, closeSettingsModal);
    bus.on(EventTypes.UI_BACKGROUND_SHOW, showBackgroundOverlay);
    bus.on(EventTypes.UI_BACKGROUND_HIDE, hideBackgroundOverlay);
    bus.on(EventTypes.UI_ACTIVE_NUMBER_SHOW, ({ value, delayMs }) => showActiveNumberOverlay(value));
    bus.on(EventTypes.UI_ACTIVE_NUMBER_HIDE, hideActiveNumberOverlay);
    bus.on(EventTypes.UI_HIGHLIGHT, highlightSelection);
    bus.on(EventTypes.UI_REPEAT_LEFT_SET, (val) => {
      if (elements.repeatLeft && String(elements.repeatLeft.textContent) !== String(val)) {
        elements.repeatLeft.textContent = String(val);
      }
      updateControlsState();
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      view.appState = s;
      updateStartPauseButton();
      updateControlsState();
    });
    bus.on(EventTypes.UI_TEXTS_UPDATE, updateUILabels);

    const onVoices = ({ voices, availableLanguages: langs }) => {
      view.voices = (voices || []).map((v) => ({ name: v.name, lang: v.lang }));
      view.availableLanguages = (langs || []).slice();
      if (!view.availableLanguages.includes("ALL")) view.availableLanguages.push("ALL");
      populateLanguageSelect();
      populateVoiceSelect();
    };
    bus.on(EventTypes.VOICES_CHANGED, onVoices);
    bus.on(EventTypes.VOICES_LOADED, onVoices);

    bus.on(EventTypes.SETTINGS_CHANGED, (newSettings) => {
      setSelectsFromSettings(newSettings);
      view.settings = { ...newSettings };
      theme.applyThemeFromSettings(newSettings);
      setLanguageCodeFromSettings();
      setVoiceFromSettings();
      updateUILabels();
      highlightSelection();
    });

    bus.on(EventTypes.PLAYBACK_INDEX, (idx) => {
      view.index = idx;
      highlightSelection();
    });
  }

  return {
    cache,
    cacheInputs,
    getInputs,
    getSelectedInputs,
    setSelectsFromSettings,
    populateLanguageSelect,
    populateVoiceSelect,
    setLanguageCodeFromSettings,
    setVoiceFromSettings,
    updateUILabels,
    updateStartPauseButton,
    updateControlsState,
    showBackgroundOverlay,
    hideBackgroundOverlay,
    showActiveNumberOverlay,
    hideActiveNumberOverlay,
    updateSettingsFromUI,
    attachEventHandlers,
    bindEventSubscriptions,
    resetRepeatLeft,
    fillRandom,
    highlightSelection,
    isAppHelpModalOpen,
    isSettingsModalOpen,
    elements,
  };
}
