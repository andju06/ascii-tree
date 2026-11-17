import "server-only";
import type { Collection, Db } from "mongodb";
import type { Account, UserStore } from "./UserStore";

interface UserDocument {
  _id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  passwordStatus?: "temporary" | "confirmed";
  createdAt: Date;
}

export class MongoUserStore implements UserStore {
  private indexes: Promise<unknown> | null = null;

  constructor(
    private readonly getDb: () => Promise<Db>,
    private readonly collectionName = "users",
  ) {}

  async findById(id: string): Promise<Account | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: id }, { projection: { email: 1, passwordHash: 1, passwordSalt: 1, passwordStatus: 1 } });
    return doc ? toAccount(doc) : null;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ email }, { projection: { email: 1, passwordHash: 1, passwordSalt: 1, passwordStatus: 1 } });
    return doc ? toAccount(doc) : null;
  }

  async list(limit: number): Promise<{ id: string; loginId: string; createdAt: string; passwordStatus: "temporary" | "confirmed" }[]> {
    const collection = await this.collection();
    const docs = await collection
      .find({}, { projection: { email: 1, createdAt: 1, passwordStatus: 1 } })
      .sort({ createdAt: -1, _id: 1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => ({
      id: doc._id,
      loginId: doc.email,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
      passwordStatus: doc.passwordStatus === "temporary" ? "temporary" : "confirmed",
    }));
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  async insert(account: Account): Promise<boolean> {
    const collection = await this.collection();
    try {
      await collection.insertOne({
        _id: account.id,
        email: account.email,
        passwordHash: account.passwordHash,
        passwordSalt: account.passwordSalt,
        passwordStatus: account.passwordStatus,
        createdAt: new Date(),
      });
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  async setPasswordStatus(id: string, passwordStatus: "temporary" | "confirmed"): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.updateOne({ _id: id }, { $set: { passwordStatus } });
    return result.matchedCount === 1;
  }

  async confirmPassword(id: string, passwordHash: string, passwordSalt: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.updateOne({ _id: id }, { $set: { passwordHash, passwordSalt, passwordStatus: "confirmed" } });
    return result.matchedCount === 1;
  }

  private async collection(): Promise<Collection<UserDocument>> {
    const collection = (await this.getDb()).collection<UserDocument>(this.collectionName);
    this.indexes ??= collection.createIndex({ email: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}

function toAccount(doc: Pick<UserDocument, "_id" | "email" | "passwordHash" | "passwordSalt" | "passwordStatus">): Account {
  return {
    id: doc._id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    passwordSalt: doc.passwordSalt,
    passwordStatus: doc.passwordStatus === "temporary" ? "temporary" : "confirmed",
  };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
