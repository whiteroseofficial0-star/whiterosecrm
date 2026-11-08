"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  PhoneCall,
  Calendar,
  CheckSquare,
  Video,
  FileText,
  Building2,
  FolderKanban,
  Wallet,
  BarChart3,
  UsersRound,
  Sparkles,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessPath } from "@/lib/rbac";
import { Icon } from "@/components/ui/icon";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/follow-ups", label: "Follow-ups", icon: PhoneCall },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => canAccessPath(permissions, item.href));
  const [collapsed, setCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(256);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("whiterose-sidebar-width");
    if (stored) setWidth(parseInt(stored, 10) || 256);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("whiterose-sidebar-width", String(width));
  }, [width]);

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(500, Math.max(200, startWidth + ev.clientX - startX));
      setWidth(next);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <aside
      style={collapsed ? undefined : { width }}
      className={cn(
        "relative hidden md:flex h-screen flex-col bg-white shadow-sm dark:bg-slate-950 dark:shadow-none",
        collapsed ? "w-[76px]" : dragging ? "transition-none" : "transition-all duration-200"
      )}
    >
      <div className="flex h-[88px] items-center gap-3 border-b-2 border-b-slate-400 px-4 dark:border-b-slate-500">
        <img src="/logo.png" alt="WhiteRose" className="h-16 w-16 shrink-0 object-contain" />
        {!collapsed && (
          <div className="flex flex-col justify-center leading-none">
            <p className="text-lg font-bold leading-none text-slate-900 dark:text-white">WhiteRose</p>
            <p className="mt-1 text-xs leading-none text-slate-500 dark:text-slate-400">Business OS</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div
          onPointerDown={startDrag}
          className={cn(
            "absolute right-0 top-[88px] bottom-0 z-10 w-1.5 cursor-col-resize",
            dragging ? "bg-rose-500/70" : "bg-transparent hover:bg-rose-500/40 active:bg-rose-500/60"
          )}
          title="Drag to resize sidebar"
        />
      )}

      <div className="pointer-events-none absolute right-0 top-[88px] bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-rose-700 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon icon={item.icon} className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 border-t-2 border-t-slate-300 px-4 py-3 text-xs text-slate-500 hover:bg-slate-50 dark:border-t-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
      >
        {collapsed ? <Icon icon={ChevronsRight} className="h-4 w-4" /> : <Icon icon={ChevronsLeft} className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
