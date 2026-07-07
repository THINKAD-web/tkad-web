"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import type { PlanCartAddonLine, PlanCartGradeSelection, PlanCartItem } from "@/lib/plan-cart";
import { createPlanCartAddonLine } from "@/lib/plan-cart";
import { planCartEffectiveGradeSelections } from "@/lib/plan-cart-pricing";
import { PlannerMediaPackagePicker } from "@/components/planner/media-package-picker";
import { PlannerMediaQuantityStepper } from "@/components/planner/media-quantity-stepper";
import {
  PlanCartAddonAddButton,
  PlanCartItemAddonEditor,
} from "@/components/plan/plan-cart-item-addon-editor";
import { plannerPackageOptions } from "@/lib/planner/planner-media-quantity";
import { resolveGradeOptionMonthlyPriceWon } from "@/lib/media-quantity";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  item: PlanCartItem;
  isKo: boolean;
  onChange: (selections: PlanCartGradeSelection[]) => void;
  onAddonLinesChange: (lines: PlanCartAddonLine[]) => void;
  className?: string;
};

function nextUnusedGradeIndex(
  media: MediaItem,
  selections: PlanCartGradeSelection[],
): number {
  const opts = plannerPackageOptions(media, true);
  const used = new Set(selections.map((s) => s.priceOptionIndex));
  const free = opts.findIndex((_, i) => !used.has(i));
  return free >= 0 ? free : Math.min(opts.length - 1, 0);
}

export function PlanCartGradeSelectionsEditor({
  media,
  item,
  isKo,
  onChange,
  onAddonLinesChange,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const selections =
    planCartEffectiveGradeSelections(item, media) ?? [];

  const updateRow = (
    rowIndex: number,
    patch: Partial<PlanCartGradeSelection>,
  ) => {
    const next = selections.map((row, i) =>
      i === rowIndex ? { ...row, ...patch } : row,
    );
    onChange(next);
  };

  const removeRow = (rowIndex: number) => {
    if (selections.length <= 1) return;
    onChange(selections.filter((_, i) => i !== rowIndex));
  };

  const addRow = () => {
    const idx = nextUnusedGradeIndex(media, selections);
    onChange([...selections, { priceOptionIndex: idx, quantity: 1 }]);
  };

  const canAddMore = selections.length < (media.priceOptions?.length ?? 0);
  const addonLines = item.addonLines ?? [];

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {isKo ? "등급별 대수" : "Grade & fleet"}
      </p>

      {selections.map((sel, rowIndex) => {
        const quantities = { [media.id]: sel.quantity };
        const priceOptionIndex = { [media.id]: sel.priceOptionIndex };
        const rowTotal = resolveGradeOptionMonthlyPriceWon(
          media,
          sel.priceOptionIndex,
          sel.quantity,
        );

        return (
          <div
            key={`${sel.priceOptionIndex}-${rowIndex}`}
            className="space-y-2 rounded-lg border border-violet-400/20 bg-white/80 p-2.5 dark:border-violet-400/15 dark:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-200">
                {isKo ? `등급 ${rowIndex + 1}` : `Grade ${rowIndex + 1}`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tabular-nums text-foreground">
                  {formatCatalogPriceFieldWon(rowTotal, locale)}
                  {isKo ? "/월" : "/mo"}
                </span>
                {selections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600 dark:border-white/12"
                    aria-label={isKo ? "등급 행 삭제" : "Remove grade row"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <PlannerMediaPackagePicker
              media={media}
              isKo={isKo}
              quantities={quantities}
              priceOptionIndex={priceOptionIndex}
              onQuantityChange={() => {}}
              onPriceOptionChange={(idx) => {
                const taken = selections.some(
                  (s, i) => i !== rowIndex && s.priceOptionIndex === idx,
                );
                if (taken) return;
                updateRow(rowIndex, { priceOptionIndex: idx });
              }}
            />

            <PlannerMediaQuantityStepper
              media={media}
              units={sel.quantity}
              onChange={(units) => updateRow(rowIndex, { quantity: units })}
              isKo={isKo}
              editable
            />
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {canAddMore ? (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-violet-400/40 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/10 dark:text-violet-200"
          >
            <Plus className="h-3.5 w-3.5" />
            {isKo ? "다른 등급 추가" : "Add another grade"}
          </button>
        ) : null}
        <PlanCartAddonAddButton
          isKo={isKo}
          onClick={() =>
            onAddonLinesChange([
              ...addonLines,
              createPlanCartAddonLine({ name: isKo ? "제작비" : "Production" }),
            ])
          }
        />
      </div>

      <PlanCartItemAddonEditor
        lines={addonLines}
        isKo={isKo}
        onChange={onAddonLinesChange}
        hideAddButton
      />
    </div>
  );
}
