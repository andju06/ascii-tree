import { DEFAULT_GIFT_API_CONFIG, GiftApi } from "./GiftApi";
import { getMongoDb } from "./mongoClient";
import { MongoGiftStore } from "./MongoGiftStore";
import { MongoReplyStore } from "./MongoReplyStore";
import { RecentWrites } from "./RecentWrites";
import { ReplyApi } from "./ReplyApi";

let giftApi: GiftApi | null = null;
let replyApi: ReplyApi | null = null;

function config() {
  const ipSalt = process.env.IP_SALT ?? "";
  if (!ipSalt) console.warn("[gifts] IP_SALT is not set; IP hashes are unsalted");
  return { ...DEFAULT_GIFT_API_CONFIG, ipSalt };
}

function apis(): { gifts: GiftApi; replies: ReplyApi } {
  if (!giftApi || !replyApi) {
    const gifts = new MongoGiftStore(getMongoDb);
    const replies = new MongoReplyStore(getMongoDb);
    const recent = new RecentWrites([gifts, replies]);
    const options = config();
    giftApi = new GiftApi(gifts, replies, recent, options);
    replyApi = new ReplyApi(gifts, replies, recent, options);
  }
  return { gifts: giftApi, replies: replyApi };
}

export function getGiftApi(): GiftApi {
  return apis().gifts;
}

export function getReplyApi(): ReplyApi {
  return apis().replies;
}
