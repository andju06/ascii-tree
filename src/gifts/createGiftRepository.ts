import type { GiftRepository } from "./GiftRepository";
import { HttpGiftRepository } from "./HttpGiftRepository";
import { LocalGiftRepository } from "./LocalGiftRepository";

export function createGiftRepository(apiUrl: string | undefined): GiftRepository {
  const trimmed = apiUrl?.trim();
  return trimmed ? new HttpGiftRepository(trimmed) : new LocalGiftRepository();
}
