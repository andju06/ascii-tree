import "server-only";
import { getMongoDb } from "./mongoClient";
import { MongoSpaceGiftStore } from "./MongoSpaceGiftStore";
import { MongoSpaceReplyStore } from "./MongoSpaceReplyStore";
import { MongoSpaceStore } from "./MongoSpaceStore";
import { SpaceGuestbookApi } from "./SpaceGuestbookApi";

let spaces: MongoSpaceStore | null = null;
let guestbook: SpaceGuestbookApi | null = null;

export function getSpaceStore(): MongoSpaceStore {
  spaces ??= new MongoSpaceStore(getMongoDb);
  return spaces;
}

export function getSpaceGuestbookApi(): SpaceGuestbookApi {
  if (!guestbook) {
    const ipSalt = process.env.IP_SALT ?? "";
    if (!ipSalt) console.warn("[spaces] IP_SALT is not set; IP hashes are unsalted");
    guestbook = new SpaceGuestbookApi(getSpaceStore(), new MongoSpaceGiftStore(getMongoDb), new MongoSpaceReplyStore(getMongoDb), ipSalt);
  }
  return guestbook;
}
