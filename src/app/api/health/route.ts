import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// Fingerprints DATABASE_URL without exposing the password: enough to tell a
// placeholder or a typo apart from a value that is actually correct.
function urlDebug(raw: string) {
  const trimmed = raw.trim();
  const out: Record<string, unknown> = {
    length: raw.length,
    trimmedLength: trimmed.length,
    hasWhitespace: trimmed !== raw,
    hasPlaceholder: /<|>|db_password|password/i.test(raw),
  };
  try {
    const parsed = new URL(trimmed);
    const password = decodeURIComponent(parsed.password);
    out.scheme = parsed.protocol.replace(/:$/, "");
    out.username = decodeURIComponent(parsed.username);
    out.host = parsed.host;
    out.database = parsed.pathname.replace(/^\//, "") || "(none)";
    out.params = parsed.search;
    out.passwordLength = password.length;
    out.passwordSha256 = createHash("sha256").update(password).digest("hex").slice(0, 16);
  } catch {
    out.parseError = true;
  }
  return out;
}

// Deployment diagnostics: reports only booleans (never values) so a missing
// AUTH_SECRET / DATABASE_URL on the host can be spotted without log access.
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  let database: Record<string, unknown> & { ok: boolean } = { ok: false };
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
        url: urlDebug(process.env.DATABASE_URL ?? ""),
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
