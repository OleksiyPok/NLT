// Extracted step-by-step from app/main.js
"use strict";
export const Config = {
    PATHS: { CONFIG: "config.json" },
    DEFAULT_CONFIG: Object.freeze({
      DEVELOPER_MODE: false,
      USE_LOCAL_STORAGE: true,
      DEFAULT_VOICE: "Google Nederlands",
      DEFAULT_SETTINGS: {
        mobile: {
          uiLang: "en",
          delay: "1000",
          speed: "1.0",
          digitLength: "2",
          count: "40",
          repeat: "1",
          fullscreen: "0",
          languageCode: "nl-NL",
          voiceName: "Google Nederlands",
        },
        desktop: {
          uiLang: "en",
          delay: "1000",
          speed: "1.0",
          digitLength: "2",
          count: "40",
          repeat: "1",
          fullscreen: "0",
          languageCode: "nl-NL",
          voiceName: "Google Nederlands",
        },
      },
      ENUMS: {
        AppStates: {
          INIT: "init",
          READY: "ready",
          PLAYING: "playing",
          PAUSED: "paused",
        },
      },
    }),
    CONFIG: null,
    async load() {
      this.CONFIG = structuredClone(this.DEFAULT_CONFIG);
      try {
        const res = await fetch(this.PATHS.CONFIG);
        if (res.ok) {
          const ext = await res.json();
          if (ext.DEFAULT_SETTINGS?.mobile) {
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.mobile,
              ext.DEFAULT_SETTINGS.mobile
            );
          }
          if (ext.DEFAULT_SETTINGS?.desktop) {
            Object.assign(
              this.CONFIG.DEFAULT_SETTINGS.desktop,
              ext.DEFAULT_SETTINGS.desktop
            );
          }
          if (typeof ext.DEVELOPER_MODE === "boolean")
            this.CONFIG.DEVELOPER_MODE = ext.DEVELOPER_MODE;
          if (typeof ext.USE_LOCAL_STORAGE === "boolean")
            this.CONFIG.USE_LOCAL_STORAGE = ext.USE_LOCAL_STORAGE;
          if (typeof ext.DEFAULT_VOICE === "string")
            this.CONFIG.DEFAULT_VOICE = ext.DEFAULT_VOICE;
        }
      } catch (e) {
        console.warn("Config load failed, using defaults", e);
      }
    },
  }
