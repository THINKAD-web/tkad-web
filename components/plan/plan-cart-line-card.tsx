"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { isPerUnitGradePriceOptions, resolveMediaQuantity } from "@/lib/media-quantity";
import type { PlanCartAddonLine, PlanCartGradeSelection, PlanCartItem, PlanCartOptionSelection } from "@/lib/plan-cart";
import { createPlanCartAddonLine, planCartAddedFromLabel } from "@/lib/plan-cart";
import {
  formatPlanCartMultiOptionSummaryShort,
  planCartEffectiveOptionSelections,
  planCartItemUsesMultiOptionSelections,
} from "@/lib/plan-cart-option-selections";
import {
  planCartItemAddonTotalWon,
  planCartLineMonthlyWon,
  planCartLineUnitMonthlyWon,
  planCartResolvedUnits,
} from "@/lib/plan-cart-pricing";
import { QuoteMediaQuantityFields } from "@/components/quote/quote-media-quantity-fields";
import { PlanCartGradeSelectionsEditor } from "@/components/plan/plan-cart-grade-selections";
import {
  PlanCartAddonAddButton,
  PlanCartItemAddonEditor,
} from "@/components/plan/plan-cart-item-addon-editor";
import { shouldShowPlannerQuantityControl } from "@/lib/planner/planner-media-quantity";
import { cn } from "@/lib/utils";

type Props = {
  item: PlanCartItem;
  media: MediaItem | undefined;
  index: number;
  total: number;
  isKo: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  onRemove: (mediaId: string) => void;
  onMove: (mediaId: string, direction: "up" | "down") => void;
  onQuantityChange: (mediaId: string, units: number) => void;
  onPriceOptionChange: (mediaId: string, index: number) => void;
  onGradeSelectionsChange: (
    mediaId: string,
    selections: PlanCartGradeSelection[],
  ) => void;
  onOptionSelectionsChange: (
    mediaId: string,
    selections: PlanCartOptionSelection[],
  ) => void;
  onAddonLinesChange: (mediaId: string, lines: PlanCartAddonLine[]) => void;
  onGripDragStart: (mediaId: string) => void;
  onGripDragEnd: () => void;
  onDropOnItem: (targetMediaId: string) => void;
  onDragOverItem: (targetMediaId: string) => void;
  onDragLeaveItem: (targetMediaId: string) => void;
};

export function PlanCartLineCard({
  item,
  media,
  index,
  total,
  isKo,
  draggingId,
  dragOverId,
  onRemove,
  onMove,
  onQuantityChange,
  onPriceOptionChange,
  onGradeSelectionsChange,
  onOptionSelectionsChange,
  onAddonLinesChange,
  onGripDragStart,
  onGripDragEnd,
  onDropOnItem,
  onDragOverItem,
  onDragLeaveItem,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const lineMonthlyWon = planCartLineMonthlyWon(item, media);
  const optionRows = media ? planCartEffectiveOptionSelections(item, media) : null;
  const usesMultiOptionEditor = media
    ? planCartItemUsesMultiOptionSelections(item, media)
    : false;
  const isGradeBus = media ? isPerUnitGradePriceOptions(media) : false;
  const units = media
    ? planCartResolvedUnits(item, media)
    : item.quantity ?? 1;
  const unitMonthlyWon =
    !usesMultiOptionEditor || (optionRows?.length ?? 0) <= 1
      ? planCartLineUnitMonthlyWon(item, media)
      : 0;
  const showQtyBreakdown =
    media &&
    shouldShowPlannerQuantityControl(media) &&
    !usesMultiOptionEditor &&
    units > 1 &&
    unitMonthlyWon > 0 &&
    unitMonthlyWon !== lineMonthlyWon;
  const multiOptionSummary =
    media != null
      ? formatPlanCartMultiOptionSummaryShort(media, item, isKo)
      : undefined;
  const showMultiOptionSummary = Boolean(multiOptionSummary);
  const itemAddonTotal = planCartItemAddonTotalWon(item);
  const addonLines = item.addonLines ?? [];

  return (
    <article
      onDragOver={(e) => {
        e.preventDefault();
        if (draggingId && draggingId !== item.mediaId) {
          onDragOverItem(item.mediaId);
        }
      }}
      onDragLeave={() => onDragLeaveItem(item.mediaId)}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnItem(item.mediaId);
      }}
      className={cn(
        "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white p-3 shadow-sm transition",
        draggingId === item.mediaId && "opacity-60",
        dragOverId === item.mediaId &&
          draggingId !== item.mediaId &&
          "ring-2 ring-violet-400/70",
      )}
    >
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.mediaId);
              onGripDragStart(item.mediaId);
            }}
            onDragEnd={onGripDragEnd}
            className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg dark:bg-white/10 bg-gray-200 text-gray-500 active:cursor-grabbing dark:text-white/55"
            aria-label={isKo ? "순서 변경" : "Reorder"}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(item.mediaId, "up")}
            className="flex h-6 w-7 items-center justify-center rounded-md dark:bg-white/10 bg-gray-200 text-gray-600 disabled:opacity-30 dark:text-white/70"
            aria-label={isKo ? "위로" : "Move up"}
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(item.mediaId, "down")}
            className="flex h-6 w-7 items-center justify-center rounded-md dark:bg-white/10 bg-gray-200 text-gray-600 disabled:opacity-30 dark:text-white/70"
            aria-label={isKo ? "아래로" : "Move down"}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug break-words dark:text-white text-gray-900">
                {item.mediaName}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {[item.region, item.mediaType].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.mediaId)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl dark:bg-white/10 bg-gray-200 dark:text-white/70 text-gray-600"
              aria-label={isKo ? "삭제" : "Remove"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-gray-100 pt-2 dark:border-white/10">
            <div className="min-w-0">
              {showMultiOptionSummary ? (
                <p className="text-[11px] text-gray-500 dark:text-white/50">
                  {multiOptionSummary}
                  {units > 1
                    ? isKo
                      ? ` · 총 ${units.toLocaleString(locale)}`
                      : ` · ${units.toLocaleString(locale)} total`
                    : null}
                </p>
              ) : null}
              {showQtyBreakdown ? (
                <p className="text-[11px] text-gray-500 dark:text-white/50">
                  {formatCatalogPriceFieldWon(unitMonthlyWon, locale)}
                  {isKo ? "/월" : "/mo"}
                  <span className="mx-1">×</span>
                  <span className="font-semibold tabular-nums text-gray-700 dark:text-white/80">
                    {units.toLocaleString(locale)}
                  </span>
                </p>
              ) : null}
              <p className="text-sm font-extrabold tabular-nums tkad-home-accent-text">
                {formatCatalogPriceFieldWon(lineMonthlyWon, locale)}
                <span className="ml-0.5 text-xs font-semibold text-gray-500 dark:text-white/50">
                  {isKo ? "/월" : "/mo"}
                </span>
              </p>
              {itemAddonTotal > 0 ? (
                <p className="text-[11px] font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                  {isKo ? "부가비용 " : "Add-ons "}
                  {formatCatalogPriceFieldWon(itemAddonTotal, locale)}
                </p>
              ) : null}
              <p className="text-[10px] text-gray-400 dark:text-white/40">
                {isKo ? "제작비·부가세 별도" : "Production & VAT extra"}
              </p>
            </div>
            <span className="inline-block rounded-full dark:bg-white/10 bg-gray-200 px-2 py-0.5 text-[10px] font-semibold dark:text-white/70 text-gray-600">
              {planCartAddedFromLabel(item.addedFrom, isKo)}
            </span>
          </div>
        </div>
      </div>

      {media ? (
        <div className="mt-3 border-2 border-gray-200 bg-gray-50 p-3 dark:border-white/12 dark:bg-black/30">
          {usesMultiOptionEditor ? (
            <PlanCartGradeSelectionsEditor
              media={media}
              item={item}
              isKo={isKo}
              onChange={(selections) => {
                if (isGradeBus) {
                  onGradeSelectionsChange(item.mediaId, selections);
                } else {
                  onOptionSelectionsChange(item.mediaId, selections);
                }
              }}
              onAddonLinesChange={(lines) =>
                onAddonLinesChange(item.mediaId, lines)
              }
            />
          ) : (
            <div className="space-y-3">
              <QuoteMediaQuantityFields
                media={media}
                isKo={isKo}
                checked
                mediaQuantities={{
                  [item.mediaId]: resolveMediaQuantity(media, item.quantity),
                }}
                mediaPriceOptionIndex={{
                  [item.mediaId]: item.priceOptionIndex ?? 0,
                }}
                networkQuoteOptions={{}}
                usePackagePeriodByMediaId={{}}
                onMediaQuantityChange={onQuantityChange}
                onPriceOptionChange={(m, idx) => onPriceOptionChange(m.id, idx)}
                onNetworkQuoteOptionsChange={() => {}}
                onPackagePeriodToggle={() => {}}
                packagePeriodMeta={null}
                networkRegionLabel={isKo ? "권역" : "Region"}
                networkRegionAllLabel={isKo ? "전체" : "All"}
                packagePeriodOnlyLabel=""
                quantityEditable
              />
              <div className="flex flex-wrap gap-2">
                <PlanCartAddonAddButton
                  isKo={isKo}
                  onClick={() =>
                    onAddonLinesChange(item.mediaId, [
                      ...addonLines,
                      createPlanCartAddonLine({
                        name: isKo ? "제작비" : "Production",
                      }),
                    ])
                  }
                />
              </div>
              <PlanCartItemAddonEditor
                lines={addonLines}
                isKo={isKo}
                onChange={(lines) => onAddonLinesChange(item.mediaId, lines)}
                hideAddButton
              />
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
