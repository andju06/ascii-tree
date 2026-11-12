import "server-only";
import type { Collection, Db } from "mongodb";
import type { Reply } from "@/replies/Reply";
import type { ReplyStore } from "./ReplyStore";

interface ReplyDocument {
  _id: string;
  parentId: string;
  author: string;
  message: string;
  createdAt: Date;
  ipHash: string;
}

const PUBLIC_FIELDS = { ipHash: 0 } as const;

function toReply(doc: Omit<ReplyDocument, "ipHash">): Reply {
  return {
    id: doc._id,
    parentId: doc.parentId,
    author: doc.author,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoReplyStore implements ReplyStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "replies",
  ) {}

  async forParents(parentIds: readonly string[]): Promise<Reply[]> {
    if (parentIds.length === 0) return [];
    const collection = await this.collection();
    const docs = await collection
      .find({ parentId: { $in: [...parentIds] } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return docs.map(toReply);
  }

  async createdAfter(since: Date, limit: number): Promise<Reply[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({ createdAt: { $gt: since } }, { projection: PUBLIC_FIELDS })
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .toArray();
    return docs.map(toReply);
  }

  async countFor(parentId: string): Promise<number> {
    const collection = await this.collection();
    return collection.countDocuments({ parentId });
  }

  async hasRecentFrom(ipHash: string, after: Date): Promise<boolean> {
    const collection = await this.collection();
    const found = await collection.findOne({ ipHash, createdAt: { $gt: after } }, { projection: { _id: 1 } });
    return found !== null;
  }

  async insert(reply: Reply, ipHash: string): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: reply.id,
      parentId: reply.parentId,
      author: reply.author,
      message: reply.message,
      createdAt: new Date(reply.createdAt),
      ipHash,
    });
  }

  private async collection(): Promise<Collection<ReplyDocument>> {
    const collection = (await this.getDb()).collection<ReplyDocument>(this.collectionName);
    this.indexes ??= Promise.all([
      collection.createIndex({ parentId: 1, createdAt: 1, _id: 1 }),
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
