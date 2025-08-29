export const Utils = {
  $: (s) => document.querySelector(s),
  $all: (s) => Array.from(document.querySelectorAll(s)),
  delay: (ms) => new Promise((res) => setTimeout(res, ms)),
  safeNumber: (v, f) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
  },
  normalizeString: (s = "") =>
    String(s)
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .trim(),
  isMobileDevice: (() => {
    const MOBILE_REGEX =
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return () => {
      if (
        navigator.userAgentData &&
        typeof navigator.userAgentData.mobile === "boolean"
      )
        return navigator.userAgentData.mobile;
      return MOBILE_REGEX.test(navigator.userAgent || "");
    };
  })(),
  safeSetSelectValue(selectElem, value, fallback) {
    if (!selectElem) return fallback;
    const opts = Array.from(selectElem.options || []).map((o) => o.value);
    const chosen = opts.includes(value) ? value : fallback;
    if (selectElem.value !== chosen) selectElem.value = chosen;
    return chosen;
  },
};
