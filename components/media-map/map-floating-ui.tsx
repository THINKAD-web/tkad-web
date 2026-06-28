"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

const floatingBase =
  "pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card/90 text-foreground shadow-lg shadow-black/10 backdrop-blur-md transition-[transform,box-shadow,background-color] duration-200 hover:bg-card hover:shadow-xl dark:border-white/12 dark:bg-[#0a0a12]/88 dark:shadow-black/40 dark:hover:bg-[#12121c]/95";

type MapFloatingButtonProps = ComponentProps<"button"> & {
  icon?: LucideIcon;
  iconClassName?: string;
  compact?: boolean;
};

export function MapFloatingButton({
  icon: Icon,
  iconClassName,
  compact = false,
  className,
  children,
  ...props
}: MapFloatingButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        floatingBase,
        "tkad-type-meta font-medium",
        compact ? "h-10 w-10" : "h-10 px-3.5",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

export function mapFloatingPanelClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/80 bg-card/90 shadow-lg shadow-black/10 backdrop-blur-md",
    "dark:border-white/12 dark:bg-[#0a0a12]/88 dark:shadow-black/40",
    className,
  );
}
