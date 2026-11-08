"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Phone,
  AlertTriangle,
  Video,
  Calendar,
  CheckSquare,
  FileText,
  Wallet,
  FolderKanban,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FOLLOW_UP_REMINDER: Phone,
  OVERDUE_FOLLOW_UP: AlertTriangle,
  DEMO_REMINDER: Video,
  MEETING_REMINDER: Calendar,
  TASK_DEADLINE: CheckSquare,
  PROPOSAL_EXPIRATION: FileText,
  PAYMENT_DUE: Wallet,
  PROJECT_DEADLINE: FolderKanban,
};

const TYPE_BADGE: Record<string, "hot" | "warm" | "cold" | "danger" | "default" | "success"> = {
  FOLLOW_UP_REMINDER: "warm",
  OVERDUE_FOLLOW_UP: "danger",
  DEMO_REMINDER: "cold",
  MEETING_REMINDER: "default",
  TASK_DEADLINE: "hot",
  PROPOSAL_EXPIRATION: "warm",
  PAYMENT_DUE: "danger",
  PROJECT_DEADLINE: "default",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?page=${page}&limit=15`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load notifications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" });
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true } : n
              ),
            }
          : prev
      );
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
            }
          : prev
      );
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.link) router.push(n.link);
  };

  const unreadCount = data?.notifications.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCheck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No notifications</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? CheckSquare;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${
                  n.isRead
                    ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900/50"
                    : "border-blue-200 bg-blue-50 hover:bg-blue-100/70 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  n.isRead ? "bg-slate-100 dark:bg-slate-800" : "bg-blue-100 dark:bg-blue-900/50"
                }`}>
                  <Icon className={`h-4 w-4 ${n.isRead ? "text-slate-500" : "text-blue-600 dark:text-blue-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.isRead ? "font-normal text-slate-700 dark:text-slate-300" : "font-semibold text-slate-900 dark:text-white"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={TYPE_BADGE[n.type] ?? "default"} className="shrink-0 mt-0.5">
                  {n.type.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </div>
            );
          })}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
