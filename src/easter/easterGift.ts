import type { Gift } from "../gifts/Gift";

/** Hidden box that releases a runaway Santa. Lives in code, not in the database. */
export const EASTER_GIFT: Gift = {
  id: "easter:runaway-santa",
  author: "산타",
  message: "",
  shape: "box",
  color: "#e8394a",
  size: 0.26,
  createdAt: "2026-12-25T00:00:00.000Z",
};

export const SANTA_ESCAPED: Gift = {
  ...EASTER_GIFT,
  message: "산타는 이미 도망갔어요.\n내년 크리스마스에 다시 잡아보세요. HO HO HO!",
};
