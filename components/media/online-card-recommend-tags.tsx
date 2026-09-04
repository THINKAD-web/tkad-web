"use client";

import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { onlineCardRecommendTags } from "@/lib/online/online-card-tags";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  slug?: string;
  catalogChannel?: HomeCatalogMediaItem["catalogChannel"];
  className?: string;
};

export function OnlineCardRecommendTags({
  slug,
  catalogChannel,
  className,
}: Props) {
  if (!isOnlineCatalogMedia({ catalogChannel })) return null;
  const tags = onlineCardRecommendTags(slug);
  if (tags.length === 0) return null;

  return (
    <div className={cn("mt-1.5 flex max-h-[2.75rem] flex-wrap gap-1 overflow-hidden", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex max-w-full truncate rounded-md border border-border/80 bg-muted/40 px-1.5 py-0.5 tkad-type-note font-medium text-foreground/90"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
