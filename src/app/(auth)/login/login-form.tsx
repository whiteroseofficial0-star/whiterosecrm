"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res: { error?: string } | undefined;
    try {
      res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      setLoading(false);
      toast.error("Could not reach the server. Check that the deployment is running.");
      return;
    }
    if (res?.error) {
      setLoading(false);
      // Auth.js returns a machine-readable reason. Report that reason instead of
      // assuming every non-credential failure is a database outage.
      const messages: Record<string, string> = {
        CredentialsSignin: "Invalid email or password.",
        Configuration:
          "Server configuration error (Configuration). Check /api/health and the deployment logs.",
        AccessDenied: "This account is not allowed to sign in (AccessDenied).",
        Verification: "This sign-in link is invalid or has expired (Verification).",
      };
      toast.error(messages[res.error] ?? `Sign-in failed (${res.error}).`);
      return;
    }

    // Session is set now; fetch it so the welcome message greets the exact
    // person who signed in (e.g. "Welcome, Rachit!" + role), instead of a
    // generic WhiteRose message. Never block the navigation on this.
    let welcomeName = "";
    let welcomeRole = "";
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = (await sessionRes.json()) as {
        user?: { name?: string | null; email?: string | null; role?: string };
      } | null;
      const user = session?.user;
      welcomeName =
        user?.name?.trim() ||
        user?.email?.split("@")[0]?.replace(/[._-]+/g, " ")?.trim() ||
        "";
      const roleLabels: Record<string, string> = {
        SUPER_ADMIN: "Super Admin",
        ADMIN: "Admin",
        SALES_EXECUTIVE: "Sales Executive",
        DEVELOPER: "Developer / Project Team",
      };
      welcomeRole = (user?.role && roleLabels[user.role]) || "";
    } catch {
      // Ignore: a generic welcome is shown instead.
    }

    const firstName = welcomeName.split(" ")[0];
    toast.success(
      welcomeName
        ? `Welcome, ${firstName}!${welcomeRole ? ` Signed in as ${welcomeRole}.` : ""}`
        : "Welcome back!",
    );
    setLoading(false);
    router.push(searchParams.get("callbackUrl") || "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/logo.png" alt="WhiteRose" className="h-32 w-32 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-white">WhiteRose</h1>
            <p className="text-sm text-slate-400">Business Operating System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@whiterose.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Link href="/forgot-password" className="text-xs text-rose-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
