import type { Gift, NewGift } from "./Gift";
import type { GiftRepository } from "./GiftRepository";
import { randomGiftStyle } from "./style";
import type { GiftShape } from "./Gift";
import { parseGifts, validateNewGift } from "./validation";

const DEMO_MESSAGES: readonly [string, string, GiftShape][] = [
  ["산타", "메리 크리스마스! 올해도 수고 많았어요.", "box"],
  ["루돌프", "코가 반짝반짝, 길은 내가 비출게.", "ornament"],
  ["눈사람", "녹기 전에 인사하고 갈게요.", "box"],
  ["daisy", "첫 번째 선물은 내가 가져다 놓을게.", "box"],
  ["엘프", "포장은 제가 다 했습니다.", "ornament"],
  ["진저", "쿠키 하나 두고 갑니다.", "box"],
];

/** Browser-only storage used when no API endpoint is configured. */
export class LocalGiftRepository implements GiftRepository {
  constructor(
    private readonly storageKey = "ascii-tree:gifts",
    private readonly limit = 200,
  ) {}

  async list(): Promise<Gift[]> {
    const stored = this.read();
    if (stored !== null) return stored.slice(-this.limit);
    const seeded = this.seedDemo();
    this.write(seeded);
    return seeded;
  }

  async create(input: NewGift): Promise<Gift> {
    const result = validateNewGift(input);
    if (!result.ok) throw new Error(result.error);
    const gift: Gift = { ...result.value, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const gifts = [...(this.read() ?? []), gift].slice(-this.limit);
    this.write(gifts);
    return gift;
  }

  subscribe(listener: (gifts: Gift[]) => void): () => void {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== this.storageKey) return;
      const gifts = this.read();
      if (gifts) listener(gifts);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }

  private read(): Gift[] | null {
    const raw = localStorage.getItem(this.storageKey);
    if (raw === null) return null;
    try {
      return parseGifts(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  private write(gifts: readonly Gift[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(gifts));
    } catch (error) {
      console.warn("[LocalGiftRepository] failed to persist gifts", error);
    }
  }

  private seedDemo(): Gift[] {
    const start = Date.now() - DEMO_MESSAGES.length * 60_000;
    return DEMO_MESSAGES.map(([author, message, shape], index) => ({
      ...randomGiftStyle(),
      id: crypto.randomUUID(),
      author,
      message,
      shape,
      createdAt: new Date(start + index * 60_000).toISOString(),
    }));
  }
}
