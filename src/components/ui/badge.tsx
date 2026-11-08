import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
        warm: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        cold: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
        outline: "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
