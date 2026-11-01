// Scroll steps of the settings window (CSS scroll-snap): spacer, scroll hints and the block-number badge.

/* ---------- Scroll steps (CSS scroll-snap) ---------- */

function contentTop(container, el) {
  return (
    el.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop
  );
}

function snapOffset(container, el) {
  return (
    (parseFloat(getComputedStyle(container).scrollPaddingTop) || 0) +
    (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)
  );
}

function fitSnapSpacer(container, spacer, lastSnapEl) {
  if (!container || !spacer || !lastSnapEl || !container.clientHeight) return;
  spacer.style.height = "0px";
  const stepPos =
    contentTop(container, lastSnapEl) - snapOffset(container, lastSnapEl);
  const maxScroll = container.scrollHeight - container.clientHeight;
  spacer.style.height = Math.max(0, Math.ceil(stepPos - maxScroll)) + "px";
}

export function updateModalSnap() {
  const body = document.getElementById("settingsBody");
  if (!body || !body.clientHeight) return;
  const blocks = document.getElementById("settingsAppContent");
  fitSnapSpacer(
    body,
    document.getElementById("settingsSnapSpacer"),
    blocks && blocks.lastElementChild
  );
  updateScrollHints();
}

function updateScrollHints() {
  const body = document.getElementById("settingsBody");
  if (!body || !body.clientHeight) return;
  const canUp = body.scrollTop > 2;
  const canDown = body.scrollTop + body.clientHeight < body.scrollHeight - 2;
  body.parentElement.style.setProperty(
    "--scrollbar-w",
    body.offsetWidth - body.clientWidth + "px"
  );
  ["scrollHintLeft", "scrollHintRight"].forEach((id) => {
    const hint = document.getElementById(id);
    if (!hint) return;
    hint.classList.toggle("can-up", canUp);
    hint.classList.toggle("can-down", canDown);
  });
}

/* ---------- Step number (fraction) ---------- */

// How long the block-number badge stays visible after the last scroll (ms)
const STEP_BADGE_MS = 2000;
// Hide timers of the badges by badge id
const stepBadgeTimers = {};

function getSettingsSteps() {
  const blocks = document.getElementById("settingsAppContent");
  return blocks
    ? Array.from(blocks.children).filter((el) => el.offsetParent !== null)
    : [];
}

function showStepBadge(badgeId, container, steps) {
  const badge = document.getElementById(badgeId);
  if (!badge || !container || !steps.length || !container.clientHeight) return;

  let current = 0;
  let best = Infinity;
  steps.forEach((el, i) => {
    const pos = contentTop(container, el) - snapOffset(container, el);
    const dist = Math.abs(pos - container.scrollTop);
    if (dist < best - 0.5) {
      best = dist;
      current = i;
    }
  });
  if (
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - 2
  ) {
    current = steps.length - 1;
  }

  badge.innerHTML =
    `<span class="step-num">${current + 1}</span>` +
    `<span class="step-den">${steps.length}</span>`;
  badge.classList.add("show");
  clearTimeout(stepBadgeTimers[badgeId]);
  stepBadgeTimers[badgeId] = setTimeout(
    () => badge.classList.remove("show"),
    STEP_BADGE_MS
  );
}

export function initSnap() {
  const settingsBody = document.getElementById("settingsBody");
  settingsBody?.addEventListener("scroll", updateScrollHints, { passive: true });
  settingsBody?.addEventListener(
    "scroll",
    () => showStepBadge("stepBadgeSettings", settingsBody, getSettingsSteps()),
    { passive: true }
  );

  window.addEventListener("resize", updateModalSnap);
  window.addEventListener("orientationchange", updateModalSnap);
  window.addEventListener("load", updateModalSnap);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(updateModalSnap);
    [document.getElementById("settingsAppContent"), settingsBody].forEach((el) => el && ro.observe(el));
  }
  updateModalSnap();
}
