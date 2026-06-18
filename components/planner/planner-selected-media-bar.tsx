"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  formatCatalogPriceFieldWon,
  formatCatalogPricesSumWon,
} from "@/lib/media-price-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  catalog: MediaItem[];
  campaignMediaIds: string[];
  onRemove: (mediaId: string) => void;
  onClearAll: () => void;
  isKo: boolean;
  className?: string;
  id?: string;
};

export function PlannerSelectedMediaBar({
  catalog,
  campaignMediaIds,
  onRemove,
  onClearAll,
  isKo,
  className,
  id = "planner-selected-media-bar",
}: Props) {
  const t = useTranslations("planner");

  const byId = useMemo(
    () => new Map(catalog.map((m) => [m.id, m])),
    [catalog],
  );

  const entries = useMemo(
    () =>
      campaignMediaIds.map((id) => ({
        id,
        media: byId.get(id) ?? null,
      })),
    [campaignMediaIds, byId],
  );

  const monthlyTotal = useMemo(
    () =>
      entries.reduce((sum, { media }) => sum + (media?.price ?? 0), 0),
    [entries],
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
                  entries.map(({ media }) => media?.price ?? 0),
                  isKo ? "ko-KR" : "en-US",
                )}
                <span className="font-normal text-muted-foreground">
                  /{isKo ? "월" : "mo"}
                </span>
              </span>
              <MediaPriceExclNote isKo={isKo} className="ml-1 inline" />
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
        className="mt-3 flex flex-wrap gap-2"
        role="list"
        aria-label={t("selectedMediaBarLabel")}
      >
        {entries.map(({ id, media }) => {
          const label = media
            ? isKo
              ? media.name
              : media.nameEn || media.name
            : t("selectedMediaUnknown");
          const priceLabel =
            media && media.price > 0
              ? formatCatalogPriceFieldWon(
                  media.price,
                  isKo ? "ko-KR" : "en-US",
                )
              : null;

          return (
            <li key={id}>
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-violet-400/35 bg-white py-1 pl-3 pr-1 text-xs font-medium text-violet-800 dark:border-violet-400/25 dark:bg-white/10 dark:text-violet-100">
                <span className="max-w-[12rem] truncate sm:max-w-[16rem]">
                  {label}
                  {priceLabel ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {priceLabel}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-violet-600 transition-colors hover:bg-violet-500/15 hover:text-rose-600 dark:text-violet-300 dark:hover:text-rose-300"
                  aria-label={t("selectedMediaRemove", { name: label })}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
