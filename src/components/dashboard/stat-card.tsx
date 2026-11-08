import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "danger" | "success" | "warning";
}) {
  const accentClasses: Record<string, string> = {
    default: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3 sm:gap-4 sm:p-4">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10", accentClasses[accent])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-lg">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
