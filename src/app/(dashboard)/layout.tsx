import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permissions = session.user.permissions ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar permissions={permissions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={session.user.name ?? "Whiterose"}
          userEmail={session.user.email ?? undefined}
          roleLabel={ROLE_LABELS[session.user.role]}
        />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <MobileBottomNav permissions={permissions} />
    </div>
  );
}
