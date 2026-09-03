import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study26 - Dạy và học trực tuyến",
  description: "Nền tảng dạy học trực tuyến Study26"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
