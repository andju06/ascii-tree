/** Remembers which replies this browser has already looked at. */
export class ReadReplies {
  private readonly ids: Set<string>;

  constructor(private readonly storageKey = "ascii-tree:read-replies") {
    this.ids = new Set(this.load());
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string): void {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...this.ids]));
    } catch (error) {
      console.warn("[ReadReplies] failed to persist", error);
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
