"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  createPlanCartAddonLine,
  type PlanCartAddonLine,
} from "@/lib/plan-cart";
import { planCartAddonLineTotalWon } from "@/lib/plan-cart-pricing";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";

const PRESETS_KO = [
  { name: "제작비", unitPriceWon: 0 },
  { name: "인쇄비", unitPriceWon: 0 },
  { name: "설치비", unitPriceWon: 0 },
] as const;

type Props = {
  lines: PlanCartAddonLine[];
  isKo: boolean;
  onAdd: (line: PlanCartAddonLine) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<PlanCartAddonLine, "name" | "unitPriceWon" | "quantity">>,
  ) => void;
  onRemove: (id: string) => void;
  className?: string;
};

export function PlanCartAddonSection({
  lines,
  isKo,
  onAdd,
  onUpdate,
  onRemove,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/50">
            {isKo ? "부가 비용" : "Add-on costs"}
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-white/45">
            {isKo
              ? "제작비·설치비 등 견적서 커스텀 항목 — 기간 총액에 1회 합산"
              : "Production, install, etc. — added once to period total"}
          </p>
        </div>
        <BtnBlock
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl"
          onClick={() => onAdd(createPlanCartAddonLine({ name: isKo ? "제작비" : "Production" }))}
        >
          <Plus className="mr-1 inline h-3.5 w-3.5" />
          {isKo ? "항목 추가" : "Add line"}
        </BtnBlock>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {PRESETS_KO.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() =>
                onAdd(
                  createPlanCartAddonLine({
                    name: isKo ? preset.name : preset.name,
                    unitPriceWon: preset.unitPriceWon,
                  }),
                )
              }
              className="rounded-full border border-dashed border-hermes/30 bg-hermes/5 px-3 py-1.5 text-xs font-semibold text-hermes transition hover:bg-hermes/10"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => {
            const subtotal = planCartAddonLineTotalWon(line);
            return (
              <li
                key={line.id}
                className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-3 dark:border-white/15 dark:bg-white/[0.03] sm:flex-row sm:items-center"
              >
                <input
                  type="text"
                  value={line.name}
                  onChange={(e) => onUpdate(line.id, { name: e.target.value })}
                  placeholder={isKo ? "예) 제작비" : "e.g. Production"}
                  className="h-10 min-w-0 flex-1 rounded-lg border dark:border-white/12 border-gray-200 bg-white px-3 text-sm dark:text-white text-gray-900"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                    {isKo ? "단가(원)" : "Unit (₩)"}
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={line.unitPriceWon || ""}
                      onChange={(e) =>
                        onUpdate(line.id, {
                          unitPriceWon: Number(e.target.value) || 0,
                        })
                      }
                      className="h-10 w-28 rounded-lg border dark:border-white/12 border-gray-200 bg-white px-2 text-sm tabular-nums dark:text-white text-gray-900"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                    {isKo ? "수량" : "Qty"}
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        onUpdate(line.id, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-10 w-16 rounded-lg border dark:border-white/12 border-gray-200 bg-white px-2 text-sm tabular-nums dark:text-white text-gray-900"
                    />
                  </label>
                  <span className="min-w-[5.5rem] text-right text-sm font-bold tabular-nums text-hermes">
                    {formatCatalogPriceFieldWon(subtotal, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(line.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600 dark:border-white/12"
                    aria-label={isKo ? "삭제" : "Remove"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
