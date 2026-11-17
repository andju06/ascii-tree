import "server-only";
import type { Collection, Db } from "mongodb";
import { readTreeFeatures, type TreeFeatures } from "@/spaces/features";
import { readTreeName } from "@/spaces/treeName";

export interface Space {
  readonly slug: string;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly features: TreeFeatures;
  /** Null when the tree was created before names existed. */
  readonly name: string | null;
}

interface SpaceDocument {
  _id: string;
  ownerId: string;
  createdAt: Date;
  features?: TreeFeatures;
  name?: string;
}

function toSpace(doc: SpaceDocument): Space {
  return {
    slug: doc._id,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt.toISOString(),
    features: readTreeFeatures(doc.features),
    name: readTreeName(doc.name),
  };
}

/** One tree per account. The slug is the public share id. */
export class MongoSpaceStore {
  private indexes: Promise<unknown> | null = null;

  constructor(private readonly getDb: () => Promise<Db>) {}

  async findBySlug(slug: string): Promise<Space | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ _id: slug });
    return doc ? toSpace(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Space | null> {
    const collection = await this.collection();
    const doc = await collection.findOne({ ownerId });
    return doc ? toSpace(doc) : null;
  }

  async list(limit: number): Promise<Space[]> {
    const collection = await this.collection();
    const docs = await collection.find({}).sort({ createdAt: -1, _id: 1 }).limit(limit).toArray();
    return docs.map(toSpace);
  }

  async updateFeaturesBySlug(slug: string, features: TreeFeatures): Promise<Space | null> {
    const collection = await this.collection();
    const result = await collection.updateOne({ _id: slug }, { $set: { features } });
    if (result.matchedCount === 0) return null;
    return this.findBySlug(slug);
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: slug });
    return result.deletedCount === 1;
  }

  async updateOwned(ownerId: string, features: TreeFeatures, name: string): Promise<Space | null> {
    const collection = await this.collection();
    const result = await collection.updateOne({ ownerId }, { $set: { features, name } });
    if (result.matchedCount === 0) return null;
    return this.findByOwner(ownerId);
  }

  private async collection(): Promise<Collection<SpaceDocument>> {
    const collection = (await this.getDb()).collection<SpaceDocument>("spaces");
    this.indexes ??= collection.createIndex({ ownerId: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = null;
      throw error;
    });
    await this.indexes;
    return collection;
  }
}
