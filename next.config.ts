import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  devIndicators: false,
  // Seed TSV & spesimen dibaca lewat fs saat runtime; pastikan ikut ter-bundle ke serverless function (Vercel).
  outputFileTracingIncludes: { "/**": ["./data/seed/**", "./data/seed-ktp/**", "./data/seed-bukti/**"] },
  // Rute lama sebelum Dashboard Customer (v1.1)
  async redirects() {
    return [
      { source: "/portal", destination: "/dashboard", permanent: false },
      { source: "/portal/biodata", destination: "/dashboard/biodata", permanent: false },
      { source: "/portal/pembayaran", destination: "/dashboard/pembayaran", permanent: false },
      { source: "/akun/kata-sandi", destination: "/dashboard/akun", permanent: false },
      { source: "/admin/perpanjangan", destination: "/admin/pembayaran", permanent: false },
      // v1.2: home = katalog kost; Advertising & Layanan Properti dihapus; kelola kamar pindah ke subpage Kost
      { source: "/kost", destination: "/", permanent: false },
      { source: "/advertising/:path*", destination: "/", permanent: false },
      { source: "/properti/:path*", destination: "/", permanent: false },
      { source: "/admin/kamar", destination: "/admin/kost", permanent: false },
      { source: "/admin/katalog", destination: "/admin/kost", permanent: false },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" }, // upload foto KTP maks 3 MB
  },
};

export default nextConfig;
