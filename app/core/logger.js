"use strict";
/**
 * Tiny logger with log levels. Non-invasive: can be swapped later.
 * Comments are in English per project guideline.
 */
export const Logger = (() => {
  let level = "info"; // "debug" | "info" | "warn" | "error" | "silent"

  const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 90 };

  function setLevel(next) {
    if (next in levels) level = next;
  }

  function shouldLog(lvl) {
    return levels[lvl] >= 0 && levels[lvl] >= levels[level];
  }

  function fmt(lvl, args) {
    const ts = new Date().toISOString();
    return [`[${ts}] [${lvl.toUpperCase()}]`, ...args];
  }

  return {
    setLevel,
    debug: (...args) => { if (shouldLog("debug")) console.debug(...fmt("debug", args)); },
    info:  (...args) => { if (shouldLog("info"))  console.info (...fmt("info", args)); },
    warn:  (...args) => { if (shouldLog("warn"))  console.warn (...fmt("warn", args)); },
    error: (...args) => { if (shouldLog("error")) console.error(...fmt("error", args)); },
  };
})();
