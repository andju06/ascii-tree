import "server-only";
import { AccountAdminApi } from "./AccountAdminApi";
import { getMongoDb } from "./mongoClient";
import { GuestbookAdminApi } from "./GuestbookAdminApi";
import { MongoGiftStore } from "./MongoGiftStore";
import { MongoNoticeStore } from "./MongoNoticeStore";
import { MongoReplyStore } from "./MongoReplyStore";
import { MongoSessionStore } from "./MongoSessionStore";
import { MongoSpaceGiftStore } from "./MongoSpaceGiftStore";
import { MongoSpaceReplyStore } from "./MongoSpaceReplyStore";
import { MongoSpaceStore } from "./MongoSpaceStore";
import { MongoUserStore } from "./MongoUserStore";
import { NoticeApi } from "./NoticeApi";
import { SpaceAdminApi } from "./SpaceAdminApi";

let notices: NoticeApi | null = null;
let guestbook: GuestbookAdminApi | null = null;
let accounts: AccountAdminApi | null = null;
let spaceAdmin: SpaceAdminApi | null = null;

export function getNoticeApi(): NoticeApi {
  notices ??= new NoticeApi(new MongoNoticeStore(getMongoDb));
  return notices;
}

export function getGuestbookAdminApi(): GuestbookAdminApi {
  guestbook ??= new GuestbookAdminApi(new MongoGiftStore(getMongoDb), new MongoReplyStore(getMongoDb));
  return guestbook;
}

export function getAccountAdminApi(): AccountAdminApi {
  if (!accounts) {
    accounts = new AccountAdminApi(
      new MongoUserStore(getMongoDb),
      new MongoSessionStore(getMongoDb),
      new MongoSpaceStore(getMongoDb),
      new MongoSpaceGiftStore(getMongoDb),
      new MongoSpaceReplyStore(getMongoDb),
    );
  }
  return accounts;
}

export function getSpaceAdminApi(): SpaceAdminApi {
  if (!spaceAdmin) {
    spaceAdmin = new SpaceAdminApi(
      new MongoUserStore(getMongoDb),
      new MongoSpaceStore(getMongoDb),
      new MongoSpaceGiftStore(getMongoDb),
      new MongoSpaceReplyStore(getMongoDb),
    );
  }
  return spaceAdmin;
}
