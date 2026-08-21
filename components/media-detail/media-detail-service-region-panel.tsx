"use client";

import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaDetailMapNotice } from "@/lib/media-map/map-display-mode";

type Props = {
  notice: MediaDetailMapNotice;
  className?: string;
};

export function MediaDetailServiceRegionPanel({ notice, className }: Props) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 bg-gray-50 px-6 text-center dark:bg-[#0a0a12]",
        className,
      )}
    >
      <Truck
        className="h-8 w-8 text-[color:var(--qp-accent)]"
        aria-hidden
      />
      <p className="text-[length:var(--qp-text-body)] font-semibold dark:text-white text-gray-900">
        {notice.title}
      </p>
      <p className="max-w-sm text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
        {notice.description}
      </p>
    </div>
  );
}
