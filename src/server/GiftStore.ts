import type { Gift } from "@/gifts/Gift";

/** Persistence port for the gifts API; swap implementations without touching request handling. */
export interface GiftStore {
  /** Newest `limit` gifts, returned oldest first. */
  latest(limit: number): Promise<Gift[]>;
  /** Gifts created strictly after `since`, oldest first. */
  createdAfter(since: Date, limit: number): Promise<Gift[]>;
  hasRecentFrom(ipHash: string, after: Date): Promise<boolean>;
  insert(gift: Gift, ipHash: string): Promise<void>;
}
