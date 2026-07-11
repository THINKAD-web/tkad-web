"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MEDIA_CAMPAIGN_TARGET_CARDS } from "@/lib/media-campaign-target-cards";
import {
  MEDIA_CHIP_INACTIVE,
  MEDIA_TARGET_PAGE_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import type { MediaLandingPreview } from "@/lib/media-landing-previews";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { cn } from "@/lib/utils";

type Props = {
  previews: Record<string, MediaLandingPreview>;
  isKo: boolean;
};

export function MediaCampaignTargetsGrid({ previews, isKo }: Props) {
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
    <div className="pb-10">
      <div className="px-4 pb-6 pt-1 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            [ {isKo ? "왜 광고해?" : "Campaign goal"} ]
          </p>
          <div className="flex flex-wrap gap-2">
            {MEDIA_TARGET_PAGE_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => goToTarget(chip.value)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                  activeSlug === chip.value
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                    : cn(MEDIA_CHIP_INACTIVE, "border-transparent"),
                )}
              >
                <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:px-8">
        {MEDIA_CAMPAIGN_TARGET_CARDS.map((card) => {
          const Icon = card.icon;
          const preview = previews[card.slug];
          const count = preview?.matchCount ?? 0;
          const thumbs = preview?.thumbnails ?? [];

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
                "cursor-pointer overflow-hidden border-2 border-border bg-card transition-colors",
                "hover:border-accent/50 hover:bg-muted/30",
                activeSlug === card.slug && "border-violet-400/50 ring-2 ring-violet-500/25",
              )}
            >
              <div className="relative h-24 bg-muted">
                {thumbs.length > 0 ? (
                  <div
                    className={cn(
                      "absolute inset-0 grid gap-0.5",
                      thumbs.length === 1 && "grid-cols-1",
                      thumbs.length === 2 && "grid-cols-2",
                      thumbs.length >= 3 && "grid-cols-3",
                    )}
                  >
                    {thumbs.slice(0, 3).map((url) => {
                      const thumb = catalogThumbnailImageProps(url);
                      return (
                        <div key={url} className="relative min-h-0 min-w-0">
                          {thumb ? (
                            <Image
                              src={thumb.src}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="120px"
                              unoptimized={thumb.unoptimized}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex h-full items-center justify-center",
                      card.iconWrapClass,
                    )}
                  >
                    <Icon className="h-7 w-7" aria-hidden />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      card.iconWrapClass,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground">{card.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </div>
                <p className={cn("mt-2 text-xs", card.accentTextClass)}>
                  {card.recommendation}
                </p>
                {count > 0 ? (
                  <p className="mt-2 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                    {isKo
                      ? `매칭 ${count.toLocaleString("ko-KR")}건`
                      : `${count.toLocaleString("en-US")} matches`}
                  </p>
                ) : null}
                {card.specialHref ? (
                  <Link
                    href={card.specialHref}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "mt-2 inline-block text-xs underline-offset-2 hover:underline",
                      card.accentTextClass,
                    )}
                  >
                    {isKo ? "전용 페이지 보기 →" : "Open dedicated page →"}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
