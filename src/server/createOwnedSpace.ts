import "server-only";
import { randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import type { TreeFeatures } from "@/spaces/features";
import { getMongoDb } from "./mongoClient";

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

interface SpaceDocument {
  _id: string;
  ownerId: string;
  createdAt: Date;
  features: TreeFeatures;
  name: string;
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/** Creates the account's only tree. Returns null when one already exists. */
export async function createOwnedSpace(ownerId: string, features: TreeFeatures, name: string): Promise<{ slug: string } | null> {
  const collection: Collection<SpaceDocument> = (await getMongoDb()).collection<SpaceDocument>("spaces");
  await collection.createIndex({ ownerId: 1 }, { unique: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = [...randomBytes(8)].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
    try {
      await collection.insertOne({ _id: slug, ownerId, createdAt: new Date(), features, name });
      return { slug };
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      if (await collection.findOne({ ownerId }, { projection: { _id: 1 } })) return null;
    }
  }
  throw new Error("개인 트리 주소를 만들지 못했습니다.");
}
