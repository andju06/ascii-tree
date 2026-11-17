import "server-only";
import type { Collection, Db } from "mongodb";
import type { SessionRecord, SessionStore } from "./SessionStore";

interface SessionDocument {
  _id: string;
  userId: string;
  expiresAt: Date;
}

export class MongoSessionStore implements SessionStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "sessions",
  ) {}

  async insert(session: SessionRecord): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({ _id: session.tokenHash, userId: session.userId, expiresAt: session.expiresAt });
  }

  async findUserId(tokenHash: string, now: Date): Promise<string | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: tokenHash, expiresAt: { $gt: now } }, { projection: { userId: 1 } });
    return doc?.userId ?? null;
  }

  async delete(tokenHash: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteOne({ _id: tokenHash });
  }

  private async collection(): Promise<Collection<SessionDocument>> {
    const collection = (await this.getDb()).collection<SessionDocument>(this.collectionName);
    this.indexes ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
