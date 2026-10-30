// Keeps the screen on while the numbers are playing.
import { EventTypes } from "../core/event-types.js";

export function createWakeLock({ bus }) {
  const instance = {
    wakeLock: null,
    async request() {
      try {
        if ("wakeLock" in navigator && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
          this.wakeLock?.addEventListener?.("release", () => {});
        }
      } catch (e) {
        console.warn("WakeLock request failed", e);
        this.wakeLock = null;
      }
    },
    release() {
      if (!this.wakeLock) return;
      try {
        this.wakeLock.release?.();
      } catch (_e) {}
      this.wakeLock = null;
    },
    init() {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") {
          if (speechSynthesis.speaking && !speechSynthesis.paused) {
            bus.emit(EventTypes.PLAYBACK_PAUSE);
          }
        } else {
          this.release();
        }
      });
      bus.on(EventTypes.APP_STATE, (s) => {
        if (s === "playing") this.request();
        else this.release();
      });
    },
  };
  return instance;
}
