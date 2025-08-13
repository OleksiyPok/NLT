"use strict";
export function createWakeLock({ state, Config }) {
  return {
    wakeLock: null,
    async request() {
      try {
        if ("wakeLock" in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          if (this.wakeLock && typeof this.wakeLock.addEventListener === "function") {
            this.wakeLock.addEventListener("release", () => {});
          }
        }
      } catch (e) {
        this.wakeLock = null;
      }
    },
    release() {
      if (!this.wakeLock) return;
      try {
        if (typeof this.wakeLock.release === "function") this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    },
    init() {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (state.appState === Config.CONFIG.ENUMS.AppStates.PLAYING) this.request();
        } else {
          this.release();
        }
      });
    },
  };
}
