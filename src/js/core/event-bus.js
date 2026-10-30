// Simple publish / subscribe bus: modules talk to each other through events.
export function createEventBus() {
  const listeners = new Map();
  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  };
  const off = (event, fn) => listeners.get(event)?.delete(fn);
  const emit = (event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (e) {
        console.warn("Event error", event, e);
      }
    }
  };
  return { on, off, emit };
}
