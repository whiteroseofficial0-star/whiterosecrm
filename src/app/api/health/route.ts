import { NextResponse } from "next/server";

// Deployment diagnostics: reports only booleans (never values) so a missing
// AUTH_SECRET / DATABASE_URL on the host can be spotted without log access.
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  let database: { ok: boolean; error?: string; detail?: string } = { ok: false };
  if (!env.DATABASE_URL) {
    database = { ok: false, error: "DATABASE_URL not set" };
  } else {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.findFirst({ select: { id: true } });
      database = { ok: true };
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      // Keep the host's error text for diagnostics, but never the credentials
      // embedded in a connection string.
      const detail = raw
        .replace(/mongodb(\+srv)?:\/\/[^@\s]*@/gi, "mongodb://***@")
        .slice(0, 300);
      database = {
        ok: false,
        error: error instanceof Error ? error.name : "UnknownError",
        detail,
      };
    }
  }

  return NextResponse.json(
    {
      ok: env.AUTH_SECRET && database.ok,
      env,
      database,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
