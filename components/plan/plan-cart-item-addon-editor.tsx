"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  createPlanCartAddonLine,
  type PlanCartAddonLine,
} from "@/lib/plan-cart";
import { planCartAddonLineTotalWon } from "@/lib/plan-cart-pricing";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

const PRESETS_KO = ["제작비", "인쇄비", "설치비"] as const;

type Props = {
  lines: PlanCartAddonLine[];
  isKo: boolean;
  onChange: (lines: PlanCartAddonLine[]) => void;
  className?: string;
  /** true면 목록만 (액션 버튼은 부모에서) */
  hideAddButton?: boolean;
};

export function PlanCartItemAddonEditor({
  lines,
  isKo,
  onChange,
  className,
  hideAddButton = false,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";

  const addLine = (preset?: { name: string }) => {
    onChange([
      ...lines,
      createPlanCartAddonLine({
        name: preset?.name ?? (isKo ? "제작비" : "Production"),
      }),
    ]);
  };

  const updateLine = (
    id: string,
    patch: Partial<Pick<PlanCartAddonLine, "name" | "unitPriceWon" | "quantity">>,
  ) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        if (patch.unitPriceWon != null) {
          next.unitPriceWon = Math.max(0, Math.round(patch.unitPriceWon));
        }
        if (patch.quantity != null) {
          next.quantity = Math.max(1, Math.round(patch.quantity));
        }
        return next;
      }),
    );
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((line) => line.id !== id));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!hideAddButton ? (
        <div className="flex flex-wrap gap-2">
          {lines.length === 0
            ? PRESETS_KO.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addLine({ name })}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400/45 bg-amber-500/5 px-3 py-1.5 tkad-type-title text-amber-800 transition hover:bg-amber-500/10 dark:text-amber-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {name}
                </button>
              ))
            : null}
          <button
            type="button"
            onClick={() => addLine()}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400/45 bg-amber-500/5 px-3 py-1.5 tkad-type-title text-amber-800 transition hover:bg-amber-500/10 dark:text-amber-200"
          >
            <Plus className="h-3.5 w-3.5" />
            {isKo ? "부가비용 추가" : "Add-on cost"}
          </button>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <ul className="space-y-2">
          {lines.map((line) => {
            const subtotal = planCartAddonLineTotalWon(line);
            return (
              <li
                key={line.id}
                className="space-y-2 rounded-lg border border-dashed border-amber-300/50 bg-amber-50/50 p-2.5 dark:border-amber-400/20 dark:bg-amber-500/[0.06]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="tkad-type-note font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
                    {isKo ? "부가비용" : "Add-on"}
                  </span>
                  <span className="tkad-type-caption font-bold tabular-nums text-amber-900 dark:text-amber-100">
                    {formatCatalogPriceFieldWon(subtotal, locale)}
                  </span>
                </div>
                <input
                  type="text"
                  value={line.name}
                  onChange={(e) => updateLine(line.id, { name: e.target.value })}
                  placeholder={isKo ? "예) 제작비" : "e.g. Production"}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm dark:border-white/12 dark:bg-black/20 dark:text-white"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-w-[7rem] flex-1 items-center gap-1.5 tkad-type-caption text-gray-500 dark:text-white/50">
                    {isKo ? "금액(원)" : "Amount"}
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={line.unitPriceWon || ""}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unitPriceWon: Number(e.target.value) || 0,
                        })
                      }
                      className="h-9 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-sm tabular-nums dark:border-white/12 dark:bg-black/20 dark:text-white"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 tkad-type-caption text-gray-500 dark:text-white/50">
                    {isKo ? "수량" : "Qty"}
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-9 w-14 rounded-lg border border-gray-200 bg-white px-2 text-sm tabular-nums dark:border-white/12 dark:bg-black/20 dark:text-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600 dark:border-white/12"
                    aria-label={isKo ? "삭제" : "Remove"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** 등급 추가 버튼 옆에 둘 액션 버튼 */
export function PlanCartAddonAddButton({
  isKo,
  onClick,
  className,
}: {
  isKo: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400/45 bg-amber-500/5 px-3 py-1.5 tkad-type-title text-amber-800 transition hover:bg-amber-500/10 dark:text-amber-200",
        className,
      )}
    >
      <Plus className="h-3.5 w-3.5" />
      {isKo ? "부가비용 추가" : "Add-on cost"}
    </button>
  );
}
