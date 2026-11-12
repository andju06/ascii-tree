import type { ReplyRepository } from "../replies/ReplyRepository";
import { LocalReplyRepository } from "../replies/LocalReplyRepository";
import type { GiftRepository } from "./GiftRepository";
import { HttpGiftRepository } from "./HttpGiftRepository";
import { LocalGiftRepository } from "./LocalGiftRepository";

export interface GuestbookRepositories {
  readonly gifts: GiftRepository;
  readonly replies: ReplyRepository;
}

export function createGiftRepository(apiUrl: string | undefined): GuestbookRepositories {
  const trimmed = apiUrl?.trim();
  if (!trimmed) {
    const gifts = new LocalGiftRepository();
    return { gifts, replies: new LocalReplyRepository(gifts) };
  }
  const gifts = new HttpGiftRepository(trimmed);
  return { gifts, replies: gifts.replies() };
}
