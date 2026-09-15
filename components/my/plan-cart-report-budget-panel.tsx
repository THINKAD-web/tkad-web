"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlannerExportBudgetHonesty } from "@/lib/planner/brief/over-budget-copy";
import { formatWonAmount } from "@/lib/planner/brief/over-budget-copy";
import {
  planCartRequestBudgetOverrideNotice,
  resolveEffectiveRequestedBudgetMan,
} from "@/lib/plan-cart-report/request-budget-override";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  cartUpdatedAt?: string;
  cartRequestedBudgetMan?: number;
  budgetMan: number;
  budgetHonesty?: PlannerExportBudgetHonesty;
  overrideMan: number | null;
  onOverrideManChange: (man: number | null) => void;
  className?: string;
};

export function PlanCartReportBudgetPanel({
  isKo,
  cartUpdatedAt,
  cartRequestedBudgetMan,
  budgetMan,
  budgetHonesty,
  overrideMan,
  onOverrideManChange,
  className,
}: Props) {
  const effectiveMan = resolveEffectiveRequestedBudgetMan({
    cartRequestedBudgetMan,
    budgetMan,
    overrideMan,
  });

  const cartBaseMan =
    cartRequestedBudgetMan != null && cartRequestedBudgetMan > 0
      ? cartRequestedBudgetMan
      : null;

  const [draftMan, setDraftMan] = useState(
    overrideMan != null ? String(overrideMan) : cartBaseMan != null ? String(cartBaseMan) : "",
  );

  useEffect(() => {
    setDraftMan(
      overrideMan != null
        ? String(overrideMan)
        : cartBaseMan != null
          ? String(cartBaseMan)
          : "",
    );
  }, [overrideMan, cartBaseMan, cartUpdatedAt]);

  const showOverrideNotice =
    overrideMan != null &&
    cartBaseMan != null &&
    Math.round(overrideMan) !== Math.round(cartBaseMan);

  const mixWon = budgetHonesty?.mixWon ?? 0;
  const coverPreview = budgetHonesty?.coverValue;

  const mixLabel = useMemo(() => {
    if (!coverPreview) return isKo ? "이 구성" : "This mix";
    if (coverPreview.includes("확정")) return isKo ? "확정" : "Confirmed";
    return isKo ? "이 구성" : "This mix";
  }, [coverPreview, isKo]);

  function commitDraft() {
    const n = Number(draftMan.replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n <= 0) {
      onOverrideManChange(null);
      return;
    }
    const rounded = Math.round(n);
    if (cartBaseMan != null && rounded === cartBaseMan) {
      onOverrideManChange(null);
      return;
    }
    onOverrideManChange(rounded);
  }

  return (
    <section
      className={cn(
        "rounded-[22px] border border-gray-200 bg-gray-50 p-4 dark:border-white/12 dark:bg-white/5",
        className,
      )}
      data-testid="plan-cart-report-budget-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--qp-fg-muted)]">
        {isKo ? "예산 (보고서 표시)" : "Budget (report display)"}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/60">
            {isKo ? "요청 예산 (만원)" : "Requested budget (10k KRW)"}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={draftMan}
            onChange={(e) => setDraftMan(e.target.value.replace(/[^\d,]/g, ""))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold tabular-nums dark:border-white/15 dark:bg-white/10 dark:text-white"
            aria-label={isKo ? "요청 예산 만원" : "Requested budget"}
          />
          {cartBaseMan != null ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
              {isKo ? "카트 입력" : "Cart entry"}:{" "}
              {formatWonAmount(cartBaseMan * 10_000, isKo)}
            </p>
          ) : null}
          {showOverrideNotice ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/90">
              {planCartRequestBudgetOverrideNotice(isKo)}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-white/60">
            {mixLabel} ({isKo ? "읽기 전용" : "read-only"})
          </label>
          <div
            className="rounded-xl border border-dashed border-gray-300 bg-white/80 px-3 py-2 text-sm font-semibold tabular-nums text-gray-800 dark:border-white/20 dark:bg-white/5 dark:text-white"
            aria-readonly="true"
          >
            {mixWon > 0
              ? formatWonAmount(mixWon, isKo)
              : isKo
                ? "—"
                : "—"}
          </div>
          {coverPreview ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{coverPreview}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-white/45">
        {isKo
          ? `표시 요청 예산: ${formatWonAmount(effectiveMan * 10_000, true)} · 카트 totalBudget 은 변경되지 않습니다.`
          : `Display request: ${formatWonAmount(effectiveMan * 10_000, false)} · Cart totalBudget is unchanged.`}
      </p>
    </section>
  );
}
