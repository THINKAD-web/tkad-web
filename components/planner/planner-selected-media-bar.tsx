"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { orderPlannerSelectedMedia } from "@/lib/planner-logic";
import {
  formatCatalogPriceFieldWon,
  formatCatalogPricesSumWon,
} from "@/lib/media-price-format";
import {
  formatPlannerQuantityLabel,
  plannerMonthlyPriceWonForMedia,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  catalog: MediaItem[];
  campaignMediaIds: string[];
  campaignMediaQuantities?: CampaignMediaQuantities;
  campaignMediaPriceOptionIndex?: CampaignMediaPriceOptionIndex;
  onQuantityChange?: (mediaId: string, units: number) => void;
  onPriceOptionChange?: (mediaId: string, index: number) => void;
  supplementalById?: Record<string, MediaItem>;
  onRemove: (mediaId: string) => void;
  onClearAll: () => void;
  isKo: boolean;
  className?: string;
  id?: string;
};

export function PlannerSelectedMediaBar({
  catalog,
  campaignMediaIds,
  campaignMediaQuantities = {},
  campaignMediaPriceOptionIndex = {},
  onQuantityChange,
  onPriceOptionChange,
  supplementalById = {},
  onRemove,
  onClearAll,
  isKo,
  className,
  id = "planner-selected-media-bar",
}: Props) {
  const t = useTranslations("planner");

  const entries = useMemo(() => {
    const ordered = orderPlannerSelectedMedia(
      catalog,
      campaignMediaIds,
      supplementalById,
    );
    const byId = new Map(ordered.map((m) => [m.id, m]));
    return campaignMediaIds.map((id) => ({
      id,
      media: byId.get(id) ?? null,
    }));
  }, [campaignMediaIds, catalog, supplementalById]);

  const monthlyTotal = useMemo(
    () =>
      entries.reduce(
        (sum, { media }) =>
          sum +
          (media
            ? plannerMonthlyPriceWonForMedia(
                media,
                campaignMediaQuantities,
                campaignMediaPriceOptionIndex,
              )
            : 0),
        0,
      ),
    [entries, campaignMediaQuantities, campaignMediaPriceOptionIndex],
  );

  if (entries.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 dark:border-violet-400/20 dark:bg-violet-500/10",
        className,
      )}
      id={id}
      data-planner-selected-media-bar
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-200">
            {t("selectedMediaBarLabel")}
            <span className="ml-1.5 tabular-nums text-violet-600/80 dark:text-violet-300/80">
              {t("selectedMediaBarCount", { count: entries.length })}
            </span>
          </p>
          {monthlyTotal > 0 ? (
            <p className={cn("text-xs tabular-nums", plannerNeon.subtext)}>
              {t("campaignMonthlyTotalLabel")}{" "}
              <span className="font-semibold text-foreground">
                {formatCatalogPricesSumWon(
                  entries.map(({ media }) =>
                    media
                      ? plannerMonthlyPriceWonForMedia(
                          media,
                          campaignMediaQuantities,
                          campaignMediaPriceOptionIndex,
                        )
                      : 0,
                  ),
                  isKo ? "ko-KR" : "en-US",
                )}
                <span className="font-normal text-muted-foreground">
                  /{isKo ? "월" : "mo"}
                </span>
              </span>
              <MediaPriceExclNote isKo={isKo} inline className="ml-1" />
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 rounded-lg border border-rose-300/50 px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:border-rose-400/30 dark:text-rose-300"
        >
          {t("selectedMediaClearAll")}
        </button>
      </div>

      <ul
        className="mt-3 flex flex-col gap-2"
        role="list"
        aria-label={t("selectedMediaBarLabel")}
      >
        {entries.map(({ id, media }) => {
          const label = media
            ? isKo
              ? media.name
              : media.nameEn || media.name
            : t("selectedMediaUnknown");
          const priceWon =
            media && media.price > 0
              ? plannerMonthlyPriceWonForMedia(
                  media,
                  campaignMediaQuantities,
                  campaignMediaPriceOptionIndex,
                )
              : 0;
          const priceLabel =
            priceWon > 0
              ? formatCatalogPriceFieldWon(priceWon, isKo ? "ko-KR" : "en-US")
              : null;
          const qtyLabel =
            media != null
              ? formatPlannerQuantityLabel(
                  media,
                  campaignMediaQuantities[media.id] ?? 1,
                  isKo,
                  campaignMediaPriceOptionIndex,
                )
              : null;

          return (
            <li key={id} className="min-w-0">
              <div className="rounded-xl border border-violet-400/30 bg-white px-2.5 py-2 text-xs dark:border-violet-400/25 dark:bg-white/10">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 leading-snug font-medium text-violet-800 dark:text-violet-100">
                    <span className="line-clamp-2">{label}</span>
                    {qtyLabel ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {qtyLabel}
                      </span>
                    ) : null}
                    {priceLabel ? (
                      <span className="ml-1 font-normal tabular-nums text-muted-foreground">
                        · {priceLabel}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-violet-600 transition-colors hover:bg-violet-500/15 hover:text-rose-600 dark:text-violet-300 dark:hover:text-rose-300"
                    aria-label={t("selectedMediaRemove", { name: label })}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                {media && onQuantityChange && onPriceOptionChange ? (
                  <div className="mt-1.5 min-w-0 border-t border-violet-400/15 pt-1.5 dark:border-violet-400/10">
                    <PlannerMediaQuantityControl
                      media={media}
                      isKo={isKo}
                      quantities={campaignMediaQuantities}
                      priceOptionIndex={campaignMediaPriceOptionIndex}
                      onQuantityChange={(units) => onQuantityChange(id, units)}
                      onPriceOptionChange={(index) =>
                        onPriceOptionChange(id, index)
                      }
                      compact
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
