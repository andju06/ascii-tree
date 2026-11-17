export interface SessionRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: Date;
  /** True only when this login started from the admin desk. */
  readonly desk: boolean;
}

export interface OpenSession {
  readonly userId: string;
  readonly desk: boolean;
}

export interface SessionStore {
  insert(session: SessionRecord): Promise<void>;
  find(tokenHash: string, now: Date): Promise<OpenSession | null>;
  delete(tokenHash: string): Promise<void>;
}
