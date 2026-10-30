// Small helpers without access to the app state.
export const Utils = (() => {
  const safeNumber = (v, defVal) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : defVal;
  };
  const safeSetSelectValue = (selectEl, val, fallback) => {
    if (!selectEl) return fallback;
    const values = Array.from(selectEl.options).map((o) => o.value);
    const chosen = values.includes(val) ? val : fallback;
    if (selectEl.value !== chosen) selectEl.value = chosen;
    return chosen;
  };
  const delay = (ms) => new Promise((r) => setTimeout(r, Number(ms) || 0));
  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  const normalizeString = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();
  const deepMerge = (t, s) => {
    if (!s || typeof s !== "object") return t;
    Object.keys(s).forEach((k) => {
      if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) {
        if (!t[k] || typeof t[k] !== "object") t[k] = {};
        deepMerge(t[k], s[k]);
      } else {
        t[k] = s[k];
      }
    });
    return t;
  };
  return {
    safeNumber,
    safeSetSelectValue,
    delay,
    isMobileDevice,
    normalizeString,
    deepMerge,
  };
})();
