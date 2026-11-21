import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VanHung.xyz — Sàn Tài Nguyên & Dịch Vụ MMO Tự Động",
  description: "Hệ thống bán Via/Clone, tài khoản AI, Proxy IPv4 và dịch vụ MMO tự động 24/7 trên nền tảng Next.js + Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
