import type { Metadata } from "next";
import "./globals.css";
import "./profile/profile.css";
import "@livekit/components-styles";
import SystemAnnouncementPopup from "@/components/shared/system-announcement-popup";
import PwaRegister from "@/components/pwa/pwa-register";

export const metadata: Metadata = {
  title: "Study26 - Dạy và học trực tuyến",
  description: "Nền tảng dạy học trực tuyến Study26"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}<SystemAnnouncementPopup />      <PwaRegister />
    </body>
    </html>
  );
}
