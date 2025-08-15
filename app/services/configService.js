"use strict";
/**
 * Thin abstraction over Config module with normalization and defaults.
 * Keeps modules/ independent and unchanged.
 */
import { Config as RawConfig } from "../../modules/config.js";
import { Logger } from "../core/logger.js";
import { ConfigError } from "../core/errors.js";

export function createConfigService() {
  const cfg = { ...RawConfig }; // shallow copy to avoid accidental mutation

  /**
   * Load external config JSON (object) and merge into internal one.
   * Safe to call multiple times.
   */
  function mergeExternal(external) {
    try {
      if (!external || typeof external !== "object") return;
      if (typeof external.DEVELOPER_MODE === "boolean")
        cfg.DEVELOPER_MODE = external.DEVELOPER_MODE;
      if (typeof external.USE_LOCAL_STORAGE === "boolean")
        cfg.USE_LOCAL_STORAGE = external.USE_LOCAL_STORAGE;
      if (typeof external.DEFAULT_VOICE === "string")
        cfg.DEFAULT_VOICE = external.DEFAULT_VOICE;

      if (external.DEFAULT_SETTINGS && typeof external.DEFAULT_SETTINGS === "object") {
        for (const formFactor of Object.keys(cfg.DEFAULT_SETTINGS)) {
          cfg.DEFAULT_SETTINGS[formFactor] = {
            ...cfg.DEFAULT_SETTINGS[formFactor],
            ...(external.DEFAULT_SETTINGS[formFactor] || {})
          };
        }
      }
    } catch (e) {
      Logger.warn("Config merge failed, using previous values", e);
      throw new ConfigError("Failed to merge external config", e);
    }
  }

  function get() { return cfg; }

  return { get, mergeExternal };
}
