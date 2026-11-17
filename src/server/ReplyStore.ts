import type { Reply } from "@/replies/Reply";

/** Persistence port for guestbook replies. */
export interface ReplyStore {
  /** Replies whose parent is one of `parentIds`, oldest first. */
  forParents(parentIds: readonly string[]): Promise<Reply[]>;
  /** Replies created strictly after `since`, oldest first. */
  createdAfter(since: Date, limit: number): Promise<Reply[]>;
  countFor(parentId: string): Promise<number>;
  hasRecentFrom(ipHash: string, after: Date): Promise<boolean>;
  insert(reply: Reply, ipHash: string): Promise<void>;
  updateText(id: string, text: { readonly author: string; readonly message: string }): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  deleteForParent(parentId: string): Promise<void>;
}
