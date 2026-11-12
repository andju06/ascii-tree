import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles.css";

export const metadata: Metadata = {
  title: "ASCII Christmas Tree",
  description: "코드로 쌓아 올리는 ASCII 크리스마스 트리와 선물 방명록",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
