import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
  ],
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.URL,
    AUTH_URL: process.env.AUTH_URL ?? process.env.URL,
  },
};

export default nextConfig;
