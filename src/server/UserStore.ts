export interface Account {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly passwordSalt: string;
}

export interface UserStore {
  findById(id: string): Promise<Account | null>;
  findByEmail(email: string): Promise<Account | null>;
  /** Returns false when the email is already registered. */
  insert(account: Account): Promise<boolean>;
}
