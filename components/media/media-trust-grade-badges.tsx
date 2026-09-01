import { BadgeCheck, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";

type Props = {
  media: MediaItem;
  isKo?: boolean;
  compact?: boolean;
  className?: string;
};

function isPremiumMedia(media: MediaItem): boolean {
  const execCount = media.executionCount ?? 0;
  const rating = media.averageRating ?? 0;
  return execCount >= 10 && rating >= 4.5;
}

export function MediaTrustGradeBadges({
  media,
  isKo = true,
  compact = false,
  className,
}: Props) {
  const showVerified = media.isVerified;
  const showPremium = isPremiumMedia(media);
  const showInstant = isInstantBookingEligible(media).eligible;

  if (!showVerified && !showPremium && !showInstant) return null;

  const chipClass = compact
    ? "px-1.5 py-0.5 tkad-type-note gap-0.5"
    : "px-2 py-0.5 text-xs gap-1";

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {showVerified ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-semibold",
            chipClass,
            "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
          )}
        >
          <BadgeCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          VERIFIED
        </span>
      ) : null}
      {showPremium ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-semibold",
            chipClass,
            "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          <Crown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          PREMIUM
        </span>
      ) : null}
      {showInstant ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-semibold",
            chipClass,
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
          )}
        >
          <Zap className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {isKo ? "즉시예약(안내)" : "Instant (info)"}
        </span>
      ) : null}
    </div>
  );
}
