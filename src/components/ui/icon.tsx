"use client";

import type { LucideIcon } from "lucide-react";

export function Icon({ icon: IconComponent, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span suppressHydrationWarning>
      <IconComponent className={className} />
    </span>
  );
}
