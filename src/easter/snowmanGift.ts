import type { Gift } from "../gifts/Gift";

/** Hidden snowman that stands on the snow. Lives in code, not in the database. */
export const SNOWMAN_GIFT: Gift = {
  id: "easter:snowman",
  author: "눈사람",
  message: "",
  shape: "box",
  color: "#f4f7fb",
  size: 0.42,
  createdAt: "2026-12-24T00:00:00.000Z",
};

export const SNOWMAN_MELTED: Gift = {
  ...SNOWMAN_GIFT,
  message: "눈사람은 이미 녹아 도망갔어요.\n다음엔 꼭 잡아 보세요.",
};

export const SNOWMAN_SERVED: Gift = {
  ...SNOWMAN_GIFT,
  message: "핫초코는 이미 한 잔 나왔어요.\n식기 전에 마셨겠죠.",
};
