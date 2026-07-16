"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { ChevronDown, X, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { PlanCartGradeSelectionsEditor } from "@/components/plan/plan-cart-grade-selections";
import type { MediaItem } from "@/lib/media-data";
import { isPerUnitGradePriceOptions } from "@/lib/media-quantity";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  formatPlanCartMultiOptionSummaryShort,
  planCartItemUsesMultiOptionSelections,
} from "@/lib/plan-cart-option-selections";
import { planCartLineMonthlyWon } from "@/lib/plan-cart-pricing";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { formatPlanCartCountLabel } from "@/lib/plan-cart-limits";
import { cn } from "@/lib/utils";

type UpdatePatch = Partial<
  Pick<
    PlanCartItem,
    | "quantity"
    | "priceOptionIndex"
    | "gradeSelections"
    | "optionSelections"
    | "addonLines"
    | "usePackagePeriod"
    | "lineCampaignDays"
  >
>;

type Props = {
  cartItems: PlanCartItem[];
  catalog: readonly MediaItem[];
  locale: string;
  maxItems: number;
  onRemove: (id: string) => void;
  onUpdateItem: (mediaId: string, patch: UpdatePatch) => void;
  onClear: () => void;
};

export default function RecommendCartBar({
  cartItems,
  catalog,
  locale,
  maxItems,
  onRemove,
  onUpdateItem,
  onClear,
}: Props) {
  const t = useTranslations("recommend");
  const isKo = locale === "ko";
  const localeTag = isKo ? "ko-KR" : "en-US";
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);

  const catalogById = useMemo(
    () => new Map(catalog.map((m) => [m.id, m])),
    [catalog],
  );

  if (cartItems.length === 0) return null;

  const expandedItem = expandedMediaId
    ? cartItems.find((i) => i.mediaId === expandedMediaId)
    : undefined;
  const expandedMedia = expandedItem
    ? catalogById.get(expandedItem.mediaId)
    : undefined;
  const showExpandedEditor =
    expandedItem &&
    expandedMedia &&
    planCartItemUsesMultiOptionSelections(expandedItem, expandedMedia);

  const clearMultiOptionPatch = {
    quantity: undefined,
    priceOptionIndex: undefined,
    usePackagePeriod: undefined,
    lineCampaignDays: undefined,
  } as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
      {showExpandedEditor ? (
        <div className="max-h-[min(44dvh,360px)] overflow-y-auto border-b border-border/70 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                {expandedItem.mediaName}
              </p>
              <button
                type="button"
                onClick={() => setExpandedMediaId(null)}
                className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {isKo ? "접기" : "Collapse"}
              </button>
            </div>
            <PlanCartGradeSelectionsEditor
              compact
              media={expandedMedia}
              item={expandedItem}
              isKo={isKo}
              onChange={(selections) => {
                if (isPerUnitGradePriceOptions(expandedMedia)) {
                  onUpdateItem(expandedItem.mediaId, {
                    gradeSelections: selections,
                    ...clearMultiOptionPatch,
                  });
                } else {
                  onUpdateItem(expandedItem.mediaId, {
                    optionSelections: selections,
                    ...clearMultiOptionPatch,
                  });
                }
              }}
              onAddonLinesChange={(lines) =>
                onUpdateItem(expandedItem.mediaId, { addonLines: lines })
              }
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
          <ShoppingCart className="h-4 w-4 text-accent" />
          {t("cartTitle")}{" "}
          <span className="text-muted-foreground">
            ({formatPlanCartCountLabel(cartItems.length, maxItems, isKo)})
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {cartItems.map((item) => {
            const media = catalogById.get(item.mediaId);
            const usesMultiEditor = media
              ? planCartItemUsesMultiOptionSelections(item, media)
              : false;
            const multiSummary =
              media != null
                ? formatPlanCartMultiOptionSummaryShort(media, item, isKo)
                : undefined;
            const lineMonthly =
              media != null ? planCartLineMonthlyWon(item, media) : item.price;
            const isExpanded = expandedMediaId === item.mediaId;

            return (
              <div
                key={item.mediaId}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-2 bg-muted px-3 py-1.5",
                  usesMultiEditor
                    ? "cursor-pointer border-violet-400/50"
                    : "border-border",
                  isExpanded && "ring-2 ring-violet-400/40",
                )}
                {...(usesMultiEditor
                  ? {
                      role: "button",
                      tabIndex: 0,
                      onClick: () =>
                        setExpandedMediaId((prev) =>
                          prev === item.mediaId ? null : item.mediaId,
                        ),
                      onKeyDown: (e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedMediaId((prev) =>
                            prev === item.mediaId ? null : item.mediaId,
                          );
                        }
                      },
                    }
                  : {})}
              >
                <div className="min-w-0">
                  <span className="block max-w-[140px] truncate text-xs font-medium text-foreground">
                    {item.mediaName}
                  </span>
                  {usesMultiEditor ? (
                    <span className="block text-[10px] tabular-nums text-muted-foreground">
                      {multiSummary ?? (isKo ? "옵션 편집" : "Edit options")}
                      {" · "}
                      {formatCatalogPriceFieldWon(lineMonthly, localeTag)}
                      {isKo ? "/월" : "/mo"}
                    </span>
                  ) : null}
                </div>
                {usesMultiEditor ? (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-violet-600 transition",
                      isExpanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (expandedMediaId === item.mediaId) {
                      setExpandedMediaId(null);
                    }
                    onRemove(item.mediaId);
                  }}
                  aria-label={`${item.mediaName} ${t("cartRemoveSuffix")}`}
                  className="text-muted-foreground transition-colors hover:text-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <BtnBlock variant="secondary" size="sm" onClick={onClear}>
            {t("cartClear")}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
