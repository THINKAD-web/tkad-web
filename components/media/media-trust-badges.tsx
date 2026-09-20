import { cn } from "@/lib/utils";
import type { MediaTrustBadge } from "@/lib/media-trust";
import { trustBadgeLabel } from "@/lib/media-trust";
import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";

type Props = {
  badges: MediaTrustBadge[];
  locale?: string;
  /** @deprecated pass `locale` */
  isKo?: boolean;
  /** 썸네일 오버레이용 작은 칩 */
  compact?: boolean;
  className?: string;
};

export function MediaTrustBadges({
  badges,
  locale,
  isKo,
  compact = false,
  className,
}: Props) {
  const useKo =
    locale != null
      ? normalizeMediaDetailTextLocale(locale) === "ko"
      : (isKo ?? true);
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => (
        <span
          key={b.id}
          className={cn(
            "inline-flex items-center rounded-full border font-semibold",
            compact
              ? "border-border/70 bg-card/95 px-2 py-0.5 text-[10px] shadow-sm backdrop-blur-sm"
              : "border-border/60 bg-muted/50 px-2.5 py-1 text-xs",
          )}
        >
          {trustBadgeLabel(b, useKo)}
        </span>
      ))}
    </div>
  );
}
