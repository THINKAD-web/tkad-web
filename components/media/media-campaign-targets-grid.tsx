"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MEDIA_CAMPAIGN_TARGET_CARDS } from "@/lib/media-campaign-target-cards";
import {
  MEDIA_CHIP_INACTIVE,
  MEDIA_TARGET_PAGE_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import { cn } from "@/lib/utils";

export function MediaCampaignTargetsGrid() {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const goToTarget = useCallback(
    (slug: string) => {
      setActiveSlug(slug);
      router.push(`/media?target=${slug}`);
    },
    [router],
  );

  return (
    <div className="pb-8">
      <div className="px-4 pb-5">
        <p className="mb-2 text-xs font-bold text-pink-600 dark:text-pink-400">
          왜 광고해?
        </p>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {MEDIA_TARGET_PAGE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => goToTarget(chip.value)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                activeSlug === chip.value
                  ? "bg-pink-500 text-white"
                  : MEDIA_CHIP_INACTIVE,
              )}
            >
              <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
        {MEDIA_CAMPAIGN_TARGET_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.slug}
              role="button"
              tabIndex={0}
              onClick={() => goToTarget(card.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToTarget(card.slug);
                }
              }}
              className={cn(
                "cursor-pointer rounded-2xl border p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]",
                card.cardClass,
                activeSlug === card.slug && "ring-2 ring-pink-500/40",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  card.iconWrapClass,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>

              <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                {card.description}
              </p>
              <p className={cn("mt-2 text-xs", card.accentTextClass)}>
                {card.recommendation}
              </p>

              {card.specialHref ? (
                <Link
                  href={card.specialHref}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "mt-2 inline-block text-xs underline-offset-2 hover:underline",
                    card.accentTextClass,
                  )}
                >
                  전용 페이지 보기 →
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
