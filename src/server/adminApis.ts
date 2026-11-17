import "server-only";
import { getMongoDb } from "./mongoClient";
import { GuestbookAdminApi } from "./GuestbookAdminApi";
import { MongoGiftStore } from "./MongoGiftStore";
import { MongoNoticeStore } from "./MongoNoticeStore";
import { MongoReplyStore } from "./MongoReplyStore";
import { NoticeApi } from "./NoticeApi";

let notices: NoticeApi | null = null;
let guestbook: GuestbookAdminApi | null = null;

export function getNoticeApi(): NoticeApi {
  notices ??= new NoticeApi(new MongoNoticeStore(getMongoDb));
  return notices;
}

export function getGuestbookAdminApi(): GuestbookAdminApi {
  guestbook ??= new GuestbookAdminApi(new MongoGiftStore(getMongoDb), new MongoReplyStore(getMongoDb));
  return guestbook;
}
