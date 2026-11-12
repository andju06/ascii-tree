import type { Gift, NewGift } from "./Gift";

export interface GiftRepository {
  /** Returns the most recent gifts ordered oldest first. */
  list(): Promise<Gift[]>;
  create(input: NewGift): Promise<Gift>;
  /** Notifies about gifts created elsewhere (other tabs or visitors). Returns an unsubscribe function. */
  subscribe(listener: (gifts: Gift[]) => void): () => void;
}
