import type { Metadata } from "next";
import { AdminDesk } from "@/admin/AdminDesk";

export const metadata: Metadata = { title: "관리" };

export default function AdminPage() {
  return <AdminDesk />;
}
