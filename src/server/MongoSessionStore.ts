import "server-only";
import type { Collection, Db } from "mongodb";
import type { OpenSession, SessionRecord, SessionStore } from "./SessionStore";

interface SessionDocument {
  _id: string;
  userId: string;
  expiresAt: Date;
  desk?: boolean;
}

export class MongoSessionStore implements SessionStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "sessions",
  ) {}

  async insert(session: SessionRecord): Promise<void> {
    const collection = await this.collection();
    await collection.insertOne({
      _id: session.tokenHash,
      userId: session.userId,
      expiresAt: session.expiresAt,
      desk: session.desk,
    });
  }

  async find(tokenHash: string, now: Date): Promise<OpenSession | null> {
    const collection = await this.collection();
    const doc = await collection.findOne(
      { _id: tokenHash, expiresAt: { $gt: now } },
      { projection: { userId: 1, desk: 1 } },
    );
    if (!doc) return null;
    return { userId: doc.userId, desk: doc.desk === true };
  }

  async delete(tokenHash: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteOne({ _id: tokenHash });
  }

  async deleteForUser(userId: string): Promise<void> {
    const collection = await this.collection();
    await collection.deleteMany({ userId });
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
