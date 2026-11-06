// "Live" lists for the theme and mode selects (see the comment below).
import { updateModalSnap } from "./scroll-steps.js";

// A native <select> reports a choice only after it is confirmed (on a phone: the
// "OK" button of the picker). These lists apply every choice at once: a tap, a click
// or the arrow keys change the theme immediately, and the list stays open so that
// several themes can be tried one after another. The hidden native <select> stays the
// single source of truth, so the rest of the code keeps working with it unchanged.
const liveLists = [];

export function initLiveSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select || select.dataset.live) return;
  select.dataset.live = "1";
  select.classList.add("live-select-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const wrap = document.createElement("div");
  wrap.className = "live-select";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "live-select-btn";
  btn.id = `${selectId}Live`;
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");

  const list = document.createElement("ul");
  list.className = "live-select-list";
  list.id = `${selectId}LiveList`;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  btn.setAttribute("aria-controls", list.id);

  wrap.append(btn, list);
  select.after(wrap);

  // The label now points to the visible button
  const label = document.querySelector(`label[for="${selectId}"]`);
  if (label) label.htmlFor = btn.id;

  const isOpen = () => !list.hidden;

  function refresh() {
    const options = Array.from(select.options);
    if (list.children.length !== options.length) {
      list.replaceChildren();
      options.forEach((option) => {
        const li = document.createElement("li");
        li.className = "live-select-item";
        li.setAttribute("role", "option");
        li.addEventListener("click", () => choose(option.value));
        list.appendChild(li);
      });
    }
    options.forEach((option, i) => {
      const li = list.children[i];
      li.textContent = option.textContent;
      li.setAttribute("aria-selected", String(option.value === select.value));
    });
    const current = options.find((o) => o.value === select.value);
    btn.textContent = current ? current.textContent : "";
  }

  function scrollToCurrent() {
    const li = list.querySelector('[aria-selected="true"]');
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  function setOpen(open) {
    list.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      refresh();
      scrollToCurrent();
    }
    updateModalSnap();
  }

  function choose(value) {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    refresh();
    scrollToCurrent();
  }

  function step(delta) {
    const options = Array.from(select.options);
    const i = options.findIndex((o) => o.value === select.value);
    const next = Math.max(0, Math.min(options.length - 1, i + delta));
    choose(options[next].value);
  }

  btn.addEventListener("click", () => setOpen(!isOpen()));

  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      step(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const options = select.options;
      choose(options[e.key === "Home" ? 0 : options.length - 1].value);
    } else if (e.key === "Escape" && isOpen()) {
      // closes the list only, not the whole settings window
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  });

  // Tapping anywhere outside closes the list
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !wrap.contains(e.target)) setOpen(false);
  });

  liveLists.push({ refresh, close: () => isOpen() && setOpen(false) });
  refresh();
}

export function refreshLiveLists() {
  liveLists.forEach((l) => l.refresh());
}

export function closeLiveLists() {
  liveLists.forEach((l) => l.close());
}
