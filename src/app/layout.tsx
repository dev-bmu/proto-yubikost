import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "yubikost by BRAVE — Prototype", template: "%s | yubikost" },
  description: "Prototype yubikost: katalog kost, Dashboard Customer, dan Admin Dashboard (data dummy TSV).",
};

export const viewport: Viewport = { themeColor: "#6d51a1", width: "device-width", initialScale: 1 };

// Data TSV bisa berubah kapan saja → semua halaman dirender dinamis.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">{children}</body>
    </html>
  );
}
