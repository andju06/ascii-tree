export interface Reply {
  readonly id: string;
  readonly parentId: string;
  readonly author: string;
  readonly message: string;
  /** ISO-8601 UTC timestamp. */
  readonly createdAt: string;
}

export interface NewReply {
  readonly parentId: string;
  readonly author: string;
  readonly message: string;
}

export const REPLY_LIMITS = {
  authorMax: 20,
  messageMax: 80,
  perParent: 20,
} as const;
