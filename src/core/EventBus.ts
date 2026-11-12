type Handler<T> = (payload: T) => void;
type HandlerMap<Events> = { [K in keyof Events]?: Set<Handler<Events[K]>> };

export class EventBus<Events extends Record<string, unknown>> {
  private readonly handlers: HandlerMap<Events> = {};

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers[type];
    if (!set) {
      set = new Set<Handler<Events[K]>>();
      this.handlers[type] = set;
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers[type];
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[EventBus] handler for "${String(type)}" failed`, error);
      }
    }
  }
}
