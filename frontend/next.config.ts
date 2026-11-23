import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "pctfoqbnqxwsauhsehnk.supabase.co" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async rewrites() {
    const backend = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");
    return [
      { source: "/favicon.ico", destination: "/icon.svg" },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
