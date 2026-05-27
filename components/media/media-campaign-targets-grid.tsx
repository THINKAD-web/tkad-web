"use client";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MEDIA_CAMPAIGN_TARGET_CARDS } from "@/lib/media-campaign-target-cards";
import { cn } from "@/lib/utils";

export function MediaCampaignTargetsGrid() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-4 px-4 pb-8 md:grid-cols-4">
      {MEDIA_CAMPAIGN_TARGET_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.slug}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/media?target=${card.slug}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/media?target=${card.slug}`);
              }
            }}
            className={cn(
              "cursor-pointer rounded-2xl border p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]",
              card.cardClass,
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
  );
}
