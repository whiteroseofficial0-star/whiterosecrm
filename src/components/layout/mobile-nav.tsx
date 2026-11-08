"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, PhoneCall, Wallet, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessPath, hasPermission } from "@/lib/rbac";
import { Icon } from "@/components/ui/icon";

const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/follow-ups", label: "Follow-ups", icon: PhoneCall },
  { href: "/payments", label: "Payments", icon: Wallet },
];

export function MobileBottomNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const visibleItems = MOBILE_ITEMS.filter((item) => canAccessPath(permissions, item.href));
  const canAddLead = hasPermission(permissions, "leads.create");

  return (
    <>
      {canAddLead && (
        <Link
          href="/leads/new"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rose-700 text-white shadow-lg shadow-rose-700/30 md:hidden"
          aria-label="Add Lead"
        >
          <Icon icon={Plus} className="h-6 w-6" />
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
                active ? "text-rose-700" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon icon={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
