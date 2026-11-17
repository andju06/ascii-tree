import type { Notice } from "@/notices/Notice";

export interface NoticeStore {
  latest(): Promise<Notice | null>;
  list(): Promise<Notice[]>;
  insert(notice: Notice): Promise<void>;
  update(id: string, message: string, updatedAt: Date): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
