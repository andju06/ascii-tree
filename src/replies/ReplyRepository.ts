import type { NewReply, Reply } from "./Reply";

export interface ReplyRepository {
  /** Replies known to this client, oldest first. */
  current(): readonly Reply[];
  create(input: NewReply): Promise<Reply>;
  /** Fires when the cached reply list changes. Returns an unsubscribe function. */
  subscribe(listener: (replies: readonly Reply[]) => void): () => void;
}
