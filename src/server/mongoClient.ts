import "server-only";
import { MongoClient, type Db } from "mongodb";

const DEFAULT_DB_NAME = "ascii-tree";

// Reused across hot reloads in dev and across invocations of a warm serverless instance.
const cache = globalThis as typeof globalThis & { __asciiTreeMongo?: Promise<MongoClient> };

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  cache.__asciiTreeMongo ??= new MongoClient(uri, { maxPoolSize: 5 }).connect().catch((error: unknown) => {
    cache.__asciiTreeMongo = undefined;
    throw error;
  });
  const client = await cache.__asciiTreeMongo;
  return client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
}
