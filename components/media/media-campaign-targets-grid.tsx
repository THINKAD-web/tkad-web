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
      <div className="px-4 pb-6 pt-1">
        <p className="mb-3 text-xs font-bold tracking-wide text-pink-600 dark:text-pink-400">
          왜 광고해?
        </p>
        <div className="flex flex-wrap gap-2">
          {MEDIA_TARGET_PAGE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => goToTarget(chip.value)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                activeSlug === chip.value
                  ? "bg-pink-500 text-white shadow-sm shadow-pink-500/20"
                  : MEDIA_CHIP_INACTIVE,
              )}
            >
              <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
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
                "cursor-pointer rounded-2xl border p-4 transition-transform hover:scale-[1.01] active:scale-[0.99] sm:p-5",
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
