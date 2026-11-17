import "server-only";
import type { Collection, Db } from "mongodb";
import type { Gift, GiftShape } from "@/gifts/Gift";

export interface GiftSecret {
  readonly salt: string;
  readonly hash: string;
}

interface SpaceGiftDocument {
  _id: string;
  spaceId: string;
  author: string;
  message: string;
  shape: GiftShape;
  color: string;
  size: number;
  createdAt: Date;
  ipHash: string;
  passwordSalt: string;
  passwordHash: string;
}

const PUBLIC_FIELDS = { ipHash: 0, passwordSalt: 0, passwordHash: 0 } as const;

function toGift(doc: Omit<SpaceGiftDocument, "ipHash" | "passwordSalt" | "passwordHash">): Gift {
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

export class MongoSpaceGiftStore {
  private indexes: Promise<unknown> | null = null;

  constructor(private readonly getDb: () => Promise<Db>) {}

  async latest(spaceId: string, limit: number): Promise<Gift[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({ spaceId }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
    return docs.reverse().map(toGift);
  }

  async createdAfter(spaceId: string, since: Date, limit: number): Promise<Gift[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({ spaceId, createdAt: { $gt: since } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .toArray();
    return docs.map(toGift);
  }

  async hasRecentFrom(spaceId: string, ipHash: string, after: Date): Promise<boolean> {
    const collection = await this.collection();
    const found = await collection.findOne({ spaceId, ipHash, createdAt: { $gt: after } }, { projection: { _id: 1 } });
    return found !== null;
  }

  async secret(spaceId: string, id: string): Promise<GiftSecret | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: id, spaceId }, { projection: { passwordSalt: 1, passwordHash: 1 } });
    if (!doc) return null;
    return { salt: doc.passwordSalt, hash: doc.passwordHash };
  }

  async insert(spaceId: string, gift: Gift, ipHash: string, secret: GiftSecret): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: gift.id,
      spaceId,
      author: gift.author,
      message: gift.message,
      shape: gift.shape,
      color: gift.color,
      size: gift.size,
      createdAt: new Date(gift.createdAt),
      ipHash,
      passwordSalt: secret.salt,
      passwordHash: secret.hash,
    });
  }

  async updateText(spaceId: string, id: string, text: { readonly author: string; readonly message: string }): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.updateOne(
      { _id: id, spaceId },
      { $set: { author: text.author, message: text.message } },
    );
    return result.matchedCount === 1;
  }

  async delete(spaceId: string, id: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: id, spaceId });
    return result.deletedCount === 1;
  }

  async deleteForSpace(spaceId: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteMany({ spaceId });
  }

  async latestAcross(limit: number): Promise<{ spaceId: string; gift: Gift }[]> {
    const collection = await this.collection();
    const docs = await collection.find({}, { projection: PUBLIC_FIELDS }).sort({ createdAt: -1, _id: -1 }).limit(limit).toArray();
    return docs.map((doc) => ({ spaceId: doc.spaceId, gift: toGift(doc) }));
  }

  private async collection(): Promise<Collection<SpaceGiftDocument>> {
    const collection = (await this.getDb()).collection<SpaceGiftDocument>("spaceGifts");
    this.indexes ??= Promise.all([
      collection.createIndex({ spaceId: 1, createdAt: 1, _id: 1 }),
      collection.createIndex({ spaceId: 1, ipHash: 1, createdAt: -1 }),
    ]).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
