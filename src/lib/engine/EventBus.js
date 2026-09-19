// Domain listeners run in registration order. A listener may hold up the command that emitted it.
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    const entry = { handler, once: false };
    handlers.push(entry);
    this.listeners.set(type, handlers);
    return () => this.removeEntry(type, entry);
  }

  once(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    const entry = { handler, once: true };
    handlers.push(entry);
    this.listeners.set(type, handlers);
    return () => this.removeEntry(type, entry);
  }

  off(type, handler) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    this.listeners.set(type, handlers.filter((entry) => entry.handler !== handler));
  }

  removeEntry(type, entry) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    this.listeners.set(type, handlers.filter((candidate) => candidate !== entry));
  }

  async emit(type, detail = {}) {
    // Copy the list so subscriptions made during dispatch start with the next event.
    for (const entry of [...(this.listeners.get(type) ?? [])]) {
      if (!(this.listeners.get(type) ?? []).includes(entry)) continue;
      if (entry.once) this.removeEntry(type, entry);
      await entry.handler(detail);
    }
  }

  async emitCancellable(type, detail = {}) {
    const event = {
      ...detail,
      cancelled: false,
      reason: '',
      cancel(reason = '') {
        this.cancelled = true;
        this.reason = reason;
      }
    };
    await this.emit(type, event);
    return event;
  }
}
