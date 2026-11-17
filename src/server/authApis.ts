import "server-only";
import { AuthApi } from "./AuthApi";
import { getMongoDb } from "./mongoClient";
import { MongoSessionStore } from "./MongoSessionStore";
import { MongoUserStore } from "./MongoUserStore";

let authApi: AuthApi | null = null;

export function getAuthApi(): AuthApi {
  authApi ??= new AuthApi(new MongoUserStore(getMongoDb), new MongoSessionStore(getMongoDb));
  return authApi;
}
