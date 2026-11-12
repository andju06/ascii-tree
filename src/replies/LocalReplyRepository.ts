import { REPLY_LIMITS, type NewReply, type Reply } from "./Reply";
import type { ReplyRepository } from "./ReplyRepository";
import { parseReplies, validateNewReply } from "./validation";

interface GiftIndex {
  list(): Promise<readonly { id: string }[]>;
}

/** Browser-only replies used when no API endpoint is configured. */
export class LocalReplyRepository implements ReplyRepository {
  private readonly listeners = new Set<(replies: readonly Reply[]) => void>();

  constructor(
    private readonly gifts: GiftIndex,
    private readonly storageKey = "ascii-tree:replies",
  ) {}

  current(): readonly Reply[] {
    return this.read();
  }

  async create(input: NewReply): Promise<Reply> {
    const result = validateNewReply(input);
    if (!result.ok) throw new Error(result.error);

    const parents = await this.gifts.list();
    if (!parents.some((gift) => gift.id === result.value.parentId)) {
      throw new Error("목록에 없는 글에는 답글을 달 수 없습니다.");
    }

    const existing = this.read();
    const count = existing.filter((reply) => reply.parentId === result.value.parentId).length;
    if (count >= REPLY_LIMITS.perParent) throw new Error("이 글에는 답글을 더 달 수 없습니다.");

    const reply: Reply = { ...result.value, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.write([...existing, reply]);
    for (const listener of this.listeners) listener(this.read());
    return reply;
  }

  subscribe(listener: (replies: readonly Reply[]) => void): () => void {
    this.listeners.add(listener);
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== this.storageKey) return;
      listener(this.read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  private read(): Reply[] {
    const raw = localStorage.getItem(this.storageKey);
    if (raw === null) return [];
    try {
      return parseReplies(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  private write(replies: readonly Reply[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(replies));
    } catch (error) {
      console.warn("[LocalReplyRepository] failed to persist replies", error);
    }
  }
}
