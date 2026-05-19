"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  averageRating?: number;
  reviewCount?: number;
  isKo?: boolean;
  className?: string;
};

export function MediaRatingBadge({
  averageRating,
  reviewCount,
  isKo = true,
  className,
}: Props) {
  if (
    reviewCount == null ||
    reviewCount <= 0 ||
    averageRating == null ||
    averageRating <= 0
  ) {
    return null;
  }

  const countLabel = isKo ? `${reviewCount}개` : `${reviewCount}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400",
        className,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="tabular-nums">{averageRating.toFixed(1)}</span>
      <span className="text-muted-foreground">· {countLabel}</span>
    </span>
  );
}
