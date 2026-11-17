export const NOTICE_LIMITS = {
  messageMax: 80,
} as const;

export interface Notice {
  readonly id: string;
  readonly message: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
