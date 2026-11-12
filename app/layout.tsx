import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles.css";

const title = "ASCII Christmas Tree";
const description = "코드로 쌓아 올리는 아스키 크리스마스 트리와 방명록";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
