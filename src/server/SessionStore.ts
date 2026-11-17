export interface SessionRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
}

export interface SessionStore {
  insert(session: SessionRecord): Promise<void>;
  findUserId(tokenHash: string, now: Date): Promise<string | null>;
  delete(tokenHash: string): Promise<void>;
}
