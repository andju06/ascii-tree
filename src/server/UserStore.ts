export type PasswordStatus = "temporary" | "confirmed";

export interface Account {
  readonly id: string;
  /** Login id. Accounts created with an email address keep that address here. */
  readonly email: string;
  readonly passwordHash: string;
  readonly passwordSalt: string;
  /** Missing on older accounts, which count as confirmed. */
  readonly passwordStatus: PasswordStatus;
}

export interface UserStore {
  findById(id: string): Promise<Account | null>;
  findByEmail(email: string): Promise<Account | null>;
  /** Returns false when the email is already registered. */
  insert(account: Account): Promise<boolean>;
  /** Replaces the password and marks it confirmed. */
  confirmPassword(id: string, passwordHash: string, passwordSalt: string): Promise<boolean>;
}
