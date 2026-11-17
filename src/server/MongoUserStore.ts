import "server-only";
import type { Collection, Db } from "mongodb";
import type { Account, UserStore } from "./UserStore";

interface UserDocument {
  _id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
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
    const doc = await collection.findOne({ _id: id }, { projection: { email: 1, passwordHash: 1, passwordSalt: 1 } });
    return doc ? toAccount(doc) : null;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ email }, { projection: { email: 1, passwordHash: 1, passwordSalt: 1 } });
    return doc ? toAccount(doc) : null;
  }

  async insert(account: Account): Promise<boolean> {
    const collection = await this.collection();
    try {
      await collection.insertOne({
        _id: account.id,
        email: account.email,
        passwordHash: account.passwordHash,
        passwordSalt: account.passwordSalt,
        createdAt: new Date(),
      });
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
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

function toAccount(doc: Pick<UserDocument, "_id" | "email" | "passwordHash" | "passwordSalt">): Account {
  return { id: doc._id, email: doc.email, passwordHash: doc.passwordHash, passwordSalt: doc.passwordSalt };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
