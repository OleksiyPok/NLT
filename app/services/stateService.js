"use strict";
/**
 * A small state service that composes the existing createState() and controllers/stateManager.
 * Non-breaking: consumers can migrate at their own pace.
 */
import { createState } from "../state.js";

export function createStateService() {
  const state = createState();

  function get() { return state; }
  function patch(path, value) {
    // Very small immutable-ish update helper: path like "settings.delay"
    const parts = path.split(".");
    let ref = state;
    while (parts.length > 1) {
      const key = parts.shift();
      if (!Object.prototype.hasOwnProperty.call(ref, key)) ref[key] = {};
      ref = ref[key];
    }
    ref[parts[0]] = value;
    return state;
  }

  return { get, patch };
}
