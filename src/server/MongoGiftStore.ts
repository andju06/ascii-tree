import "server-only";
import type { Collection, Db } from "mongodb";
import type { Gift, GiftShape } from "@/gifts/Gift";
import type { GiftStore } from "./GiftStore";

interface GiftDocument {
  _id: string;
  author: string;
  message: string;
  shape: GiftShape;
  color: string;
  size: number;
  createdAt: Date;
  ipHash: string;
}

const PUBLIC_FIELDS = { ipHash: 0 } as const;

function toGift(doc: Omit<GiftDocument, "ipHash">): Gift {
  return {
    id: doc._id,
    author: doc.author,
    message: doc.message,
    shape: doc.shape ?? "box",
    color: doc.color,
    size: doc.size,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoGiftStore implements GiftStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "gifts",
  ) {}

  async latest(limit: number): Promise<Gift[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({}, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
    return docs.reverse().map(toGift);
  }

  async createdAfter(since: Date, limit: number): Promise<Gift[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({ createdAt: { $gt: since } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .toArray();
    return docs.map(toGift);
  }

  async hasRecentFrom(ipHash: string, after: Date): Promise<boolean> {
    const collection = await this.collection();
    const found = await collection.findOne({ ipHash, createdAt: { $gt: after } }, { projection: { _id: 1 } });
    return found !== null;
  }

  async insert(gift: Gift, ipHash: string): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: gift.id,
      author: gift.author,
      message: gift.message,
      shape: gift.shape,
      color: gift.color,
      size: gift.size,
      createdAt: new Date(gift.createdAt),
      ipHash,
    });
  }

  private async collection(): Promise<Collection<GiftDocument>> {
    const collection = (await this.getDb()).collection<GiftDocument>(this.collectionName);
    this.indexes ??= Promise.all([
      collection.createIndex({ createdAt: 1, _id: 1 }),
      collection.createIndex({ ipHash: 1, createdAt: -1 }),
    ]).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
