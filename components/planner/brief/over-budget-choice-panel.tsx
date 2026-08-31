"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OverBudgetChoice } from "@/lib/planner/brief/over-budget-options";
import { formatOverBudgetOptionLine } from "@/lib/planner/brief/over-budget-options";
import { formatWonAmount } from "@/lib/planner/brief/over-budget-copy";
import { cn } from "@/lib/utils";

export function OverBudgetChoicePanel({
  choice,
  isKo,
  onApplyOptionA,
  onKeepCurrentMix,
  onRestorePreviousMix,
  canRestorePreviousMix,
}: {
  choice: OverBudgetChoice;
  isKo: boolean;
  onApplyOptionA: () => void;
  onKeepCurrentMix: () => void;
  onRestorePreviousMix?: () => void;
  canRestorePreviousMix?: boolean;
}) {
  const [excludedOpen, setExcludedOpen] = useState(false);
  const excluded = choice.excludedFromOptionA;

  return (
    <div
      className="mb-3 space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
      data-testid="over-budget-choice-panel"
    >
      <p className="text-xs font-semibold text-destructive">
        {isKo
          ? "현재 mix가 예산을 초과했습니다"
          : "Your mix exceeds the budget"}
      </p>

      <Card className="gap-3 border-primary/30 bg-card py-4 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            {isKo ? "Option A: 예산 내 구성 (추천)" : "Option A: Within budget (recommended)"}
          </CardTitle>
          <CardDescription className="text-xs tabular-nums">
            {formatOverBudgetOptionLine(
              choice.optionA,
              choice.budgetWon,
              isKo,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onApplyOptionA}
            data-testid="over-budget-apply-option-a"
          >
            {isKo ? "이 구성 적용" : "Apply this mix"}
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            {isKo ? "Option B: 현재 선택 유지" : "Option B: Keep current selection"}
          </CardTitle>
          <CardDescription className="text-xs tabular-nums">
            {formatOverBudgetOptionLine(
              choice.optionB,
              choice.budgetWon,
              isKo,
              { showOverPct: true },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4 pt-0 sm:flex-row">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onKeepCurrentMix}
            data-testid="over-budget-keep-current"
          >
            {isKo ? "현재 mix 유지" : "Keep current mix"}
          </Button>
          {canRestorePreviousMix && onRestorePreviousMix ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={onRestorePreviousMix}
              data-testid="over-budget-restore-previous"
            >
              {isKo ? "이전 mix 되돌리기" : "Restore previous mix"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {excluded.length > 0 ? (
        <div className="rounded-lg border border-border bg-card/80">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium"
            onClick={() => setExcludedOpen((v) => !v)}
            aria-expanded={excludedOpen}
          >
            <span>
              {isKo
                ? `예산 초과로 제외된 매체 (${excluded.length})`
                : `Excluded from within-budget mix (${excluded.length})`}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                excludedOpen && "rotate-180",
              )}
            />
          </button>
          {excludedOpen ? (
            <ul className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              {excluded.map((row) => (
                <li
                  key={row.mediaId}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <span className="truncate">
                    {row.name}
                    <span className="text-muted-foreground"> ×{row.units}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {row.costWon > 0
                      ? formatWonAmount(row.costWon, isKo)
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
