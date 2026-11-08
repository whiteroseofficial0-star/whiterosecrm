import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessPath } from "@/lib/rbac";

/**
 * Server-side guard for dashboard pages. Redirects unauthenticated users to
 * /login and users without the route's permission back to the dashboard.
 * Returning the session lets a page reuse it without calling auth() again.
 */
export async function requirePageAccess(pathname: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessPath(session.user.permissions, pathname)) redirect("/dashboard");
  return session;
}
