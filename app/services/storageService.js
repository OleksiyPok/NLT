"use strict";
/**
 * Storage service: provides a consistent API over localStorage or in-memory fallback.
 * Does not change modules/storage.js; can be slowly adopted by controllers.
 */
import { Storage as RawStorage } from "../../modules/storage.js";
import { Logger } from "../core/logger.js";
import { StorageError } from "../core/errors.js";

export function createStorageService() {
  const memory = new Map();

  function safeGet(key, fallback = null) {
    try {
      if (RawStorage && RawStorage.getItem) {
        const v = RawStorage.getItem(key);
        return v == null ? fallback : v;
      }
    } catch (e) {
      Logger.warn("Local storage get failed, using memory fallback", e);
    }
    return memory.has(key) ? memory.get(key) : fallback;
  }

  function safeSet(key, value) {
    try {
      if (RawStorage && RawStorage.setItem) {
        RawStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      Logger.warn("Local storage set failed, using memory fallback", e);
    }
    memory.set(key, value);
  }

  function safeRemove(key) {
    try {
      if (RawStorage && RawStorage.removeItem) {
        RawStorage.removeItem(key);
        return;
      }
    } catch (e) {
      Logger.warn("Local storage remove failed, using memory fallback", e);
    }
    memory.delete(key);
  }

  function safeJsonGet(key, fallback = null) {
    const raw = safeGet(key, null);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); }
    catch (e) { throw new StorageError(`Invalid JSON in key ${key}`, e); }
  }

  function safeJsonSet(key, obj) {
    try { safeSet(key, JSON.stringify(obj)); }
    catch (e) { throw new StorageError(`Failed to stringify JSON for key ${key}`, e); }
  }

  return { safeGet, safeSet, safeRemove, safeJsonGet, safeJsonSet };
}
