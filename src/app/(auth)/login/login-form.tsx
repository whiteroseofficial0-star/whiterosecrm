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
      toast.error("Server unreachable. Check the deployment's database settings.");
      return;
    }
    setLoading(false);

    if (res?.error) {
      // "CredentialsSignin" is a wrong email/password. Anything else means the
      // server could not verify the credentials (typically a database problem),
      // so say that instead of blaming the user's input.
      toast.error(
        res.error === "CredentialsSignin"
          ? "Invalid email or password."
          : `Sign-in failed (${res.error}). The server could not reach the database.`,
      );
      return;
    }
    toast.success("Welcome back WhiteRose");
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
