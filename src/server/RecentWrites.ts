export interface RecentWriteSource {
  hasRecentFrom(ipHash: string, after: Date): Promise<boolean>;
}

/** True when any source has a write from this IP inside the window. Gifts and replies share one cooldown. */
export class RecentWrites implements RecentWriteSource {
  constructor(private readonly sources: readonly RecentWriteSource[]) {}

  async hasRecentFrom(ipHash: string, after: Date): Promise<boolean> {
    const hits = await Promise.all(this.sources.map((source) => source.hasRecentFrom(ipHash, after)));
    return hits.some(Boolean);
  }
}
