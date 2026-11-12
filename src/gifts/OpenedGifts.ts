/** Remembers which gifts this browser has already unwrapped. */
export class OpenedGifts {
  private readonly ids: Set<string>;

  constructor(private readonly storageKey = "ascii-tree:opened") {
    this.ids = new Set(this.load());
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string): void {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    this.persist();
  }

  /** Drops every opened id so gifts wrap again and the Santa box can run once more. */
  clear(): void {
    if (this.ids.size === 0) return;
    this.ids.clear();
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn("[OpenedGifts] failed to clear", error);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.ids]));
    } catch (error) {
      console.warn("[OpenedGifts] failed to persist", error);
    }
  }

  private load(): string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }
}
