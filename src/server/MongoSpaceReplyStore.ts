import "server-only";
import type { Collection, Db } from "mongodb";
import type { Reply } from "@/replies/Reply";

interface SpaceReplyDocument {
  _id: string;
  spaceId: string;
  parentId: string;
  author: string;
  message: string;
  createdAt: Date;
  ipHash: string;
  passwordSalt: string;
  passwordHash: string;
}

const PUBLIC_FIELDS = { ipHash: 0, passwordSalt: 0, passwordHash: 0 } as const;

function toReply(doc: Omit<SpaceReplyDocument, "ipHash" | "passwordSalt" | "passwordHash">): Reply {
  return {
    id: doc._id,
    parentId: doc.parentId,
    author: doc.author,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoSpaceReplyStore {
  private indexes: Promise<unknown> | null = null;

  constructor(private readonly getDb: () => Promise<Db>) {}

  async forParents(spaceId: string, parentIds: readonly string[]): Promise<Reply[]> {
    if (parentIds.length === 0) return [];
    const collection = await this.collection();
    const docs = await collection
      .find({ spaceId, parentId: { $in: [...parentIds] } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return docs.map(toReply);
  }

  async createdAfter(spaceId: string, since: Date, limit: number): Promise<Reply[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({ spaceId, createdAt: { $gt: since } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .toArray();
    return docs.map(toReply);
  }

  async countFor(spaceId: string, parentId: string): Promise<number> {
    const collection = await this.collection();
    return collection.countDocuments({ spaceId, parentId });
  }

  async hasRecentFrom(spaceId: string, ipHash: string, after: Date): Promise<boolean> {
    const collection = await this.collection();
    const found = await collection.findOne({ spaceId, ipHash, createdAt: { $gt: after } }, { projection: { _id: 1 } });
    return found !== null;
  }

  async secret(spaceId: string, id: string): Promise<{ salt: string; hash: string } | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: id, spaceId }, { projection: { passwordSalt: 1, passwordHash: 1 } });
    if (!doc?.passwordSalt || !doc.passwordHash) return null;
    return { salt: doc.passwordSalt, hash: doc.passwordHash };
  }

  async insert(spaceId: string, reply: Reply, ipHash: string, secret: { salt: string; hash: string }): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: reply.id,
      spaceId,
      parentId: reply.parentId,
      author: reply.author,
      message: reply.message,
      createdAt: new Date(reply.createdAt),
      ipHash,
      passwordSalt: secret.salt,
      passwordHash: secret.hash,
    });
  }

  async updateText(spaceId: string, id: string, text: { readonly author: string; readonly message: string }): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.updateOne({ _id: id, spaceId }, { $set: { author: text.author, message: text.message } });
    return result.matchedCount === 1;
  }

  async delete(spaceId: string, id: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: id, spaceId });
    return result.deletedCount === 1;
  }

  async deleteForParent(spaceId: string, parentId: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteMany({ spaceId, parentId });
  }

  async deleteForSpace(spaceId: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteMany({ spaceId });
  }

  async forGifts(gifts: readonly { spaceId: string; id: string }[]): Promise<(Reply & { spaceId: string })[]> {
    if (gifts.length === 0) return [];
    const collection = await this.collection();
    const docs = await collection
      .find(
        { $or: gifts.map((gift) => ({ spaceId: gift.spaceId, parentId: gift.id })) },
        { projection: PUBLIC_FIELDS },
      )
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return docs.map((doc) => ({ ...toReply(doc), spaceId: doc.spaceId }));
  }

  private async collection(): Promise<Collection<SpaceReplyDocument>> {
    const collection = (await this.getDb()).collection<SpaceReplyDocument>("spaceReplies");
    this.indexes ??= Promise.all([
      collection.createIndex({ spaceId: 1, parentId: 1, createdAt: 1 }),
      collection.createIndex({ spaceId: 1, createdAt: 1, _id: 1 }),
    ]).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
