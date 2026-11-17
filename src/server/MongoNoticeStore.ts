import "server-only";
import type { Collection, Db } from "mongodb";
import type { Notice } from "@/notices/Notice";
import type { NoticeStore } from "./NoticeStore";

interface NoticeDocument {
  _id: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

function toNotice(doc: NoticeDocument): Notice {
  return {
    id: doc._id,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class MongoNoticeStore implements NoticeStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "notices",
  ) {}

  async latest(): Promise<Notice | null> {
    const collection = await this.collection();
    const docs = await collection.find().sort({ updatedAt: -1, _id: -1 }).limit(1).toArray();
    const doc = docs[0];
    return doc ? toNotice(doc) : null;
  }

  async list(): Promise<Notice[]> {
    const collection = await this.collection();
    const docs = await collection.find().sort({ updatedAt: -1, _id: -1 }).limit(50).toArray();
    return docs.map(toNotice);
  }

  async insert(notice: Notice): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: notice.id,
      message: notice.message,
      createdAt: new Date(notice.createdAt),
      updatedAt: new Date(notice.updatedAt),
    });
  }

  async update(id: string, message: string, updatedAt: Date): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.updateOne({ _id: id }, { $set: { message, updatedAt } });
    return result.matchedCount === 1;
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  private async collection(): Promise<Collection<NoticeDocument>> {
    const collection = (await this.getDb()).collection<NoticeDocument>(this.collectionName);
    this.indexes ??= collection.createIndex({ updatedAt: -1, _id: -1 }).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
