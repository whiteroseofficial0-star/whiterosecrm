import type { NextConfig } from "next";

// Render injects RENDER_EXTERNAL_URL; use it (and Netlify's URL) as a fallback
// so Auth.js builds correct callback URLs without extra configuration.
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.URL ??
  process.env.RENDER_EXTERNAL_URL;

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
  ],
  env: {
    // Only inline these when we actually know the URL; an empty value makes
    // Auth.js fail with an invalid URL instead of inferring it from the host.
    ...(appUrl
      ? { AUTH_URL: process.env.AUTH_URL ?? appUrl, NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? appUrl }
      : {}),
  },
};

export default nextConfig;
