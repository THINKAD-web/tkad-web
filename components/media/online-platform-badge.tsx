"use client";

import { resolveOnlinePlatformBadgeSpec } from "@/lib/online/online-platform-badge-spec";
import { cn } from "@/lib/utils";

type Props = {
  platform: string | null | undefined;
  /** tile = catalog card thumbnail; compact = row thumb */
  size?: "tile" | "compact";
  className?: string;
};

export function OnlinePlatformBadge({
  platform,
  size = "tile",
  className,
}: Props) {
  const spec = resolveOnlinePlatformBadgeSpec(platform);
  const isKoInitial = /[가-힣]/.test(spec.initial);
  const tile = size === "tile";

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
      style={{ background: spec.background }}
      aria-hidden
    >
      <span
        className={cn(
          "select-none font-black tracking-tight drop-shadow-sm",
          tile
            ? isKoInitial
              ? "text-2xl sm:text-3xl"
              : "text-3xl sm:text-4xl"
            : isKoInitial
              ? "text-[10px]"
              : "text-xs",
        )}
        style={{ color: spec.color }}
      >
        {spec.initial}
      </span>
    </div>
  );
}
