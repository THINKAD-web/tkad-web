"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AvailabilityTier } from "@/lib/media-availability-stats";

const TIER_STYLES: Record<
  Exclude<AvailabilityTier, "unknown">,
  string
> = {
  instant:
    "border-emerald-500/40 bg-emerald-500/90 dark:text-white text-gray-900 shadow-emerald-500/20",
  partial:
    "border-amber-500/40 bg-amber-500/90 dark:text-white text-gray-900 shadow-amber-500/20",
  scarce: "border-rose-500/40 bg-rose-500/90 dark:text-white text-gray-900 shadow-rose-500/20",
};

export function MediaAvailabilityBadge({
  tier,
  className,
  compact = false,
}: {
  tier: AvailabilityTier;
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("media.availabilityLive");

  if (tier === "unknown") return null;

  const labelKey =
    tier === "instant"
      ? "badgeInstant"
      : tier === "partial"
        ? "badgePartial"
        : "badgeScarce";

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center whitespace-nowrap border font-display font-bold uppercase leading-none tracking-[0.12em] shadow-sm sm:tracking-[0.14em]",
        compact
          ? "px-1.5 py-0.5 text-[8px] sm:text-[9px]"
          : "px-2 py-1 text-[9px] sm:text-[10px]",
        TIER_STYLES[tier],
        className,
      )}
    >
      {t(labelKey)}
    </span>
  );
}
