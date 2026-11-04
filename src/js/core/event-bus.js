// Simple event bus: modules talk to each other only through it
export function createEventBus() {
  const map = new Map();
  return {
    on(event, handler) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(handler);
      return () => map.get(event)?.delete(handler);
    },
    off(event, handler) {
      const s = map.get(event);
      if (!s) return false;
      if (!handler) {
        map.delete(event);
        return true;
      }
      return s.delete(handler);
    },
    once(event, handler) {
      let off;
      off = this.on(event, (payload) => {
        off();
        handler(payload);
      });
      return off;
    },
    emit(event, payload) {
      const subs = Array.from(map.get(event) || []);
      for (const fn of subs) {
        try {
          fn(payload);
        } catch (e) {
          console.warn("EventBus handler error", event, e);
        }
      }
    },
  };
}
