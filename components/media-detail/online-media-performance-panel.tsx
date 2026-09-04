"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaCostEstimateShort } from "@/lib/media-display-currency";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import {
  estimatePerformance,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  className?: string;
};

const inputCls =
  "h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900 outline-none focus:border-[color:var(--qp-accent)]/50 focus:ring-2 focus:ring-[color:var(--qp-accent)]/20";

export function OnlineMediaPerformancePanel({ media, isKo, className }: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const spec = media.onlineSpec;
  const calculable = hasOnlinePricingSpec(media);

  if (!calculable || !spec) {
    return null;
  }

  const defaultBudget = spec.minBudget ?? 1_000_000;
  const [budgetWon, setBudgetWon] = useState(defaultBudget);

  const estimate = useMemo(
    () => estimatePerformance(spec, budgetWon),
    [spec, budgetWon],
  );

  const belowMin =
    spec.minBudget > 0 && budgetWon > 0 && budgetWon < spec.minBudget;

  return (
    <section
      className={cn(
        "rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5",
        className,
      )}
      aria-labelledby="online-performance-heading"
    >
      <h2
        id="online-performance-heading"
        className="text-lg font-bold dark:text-white text-gray-900"
      >
        {isKo ? "예상 성과 (참고)" : "Estimated performance (reference)"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/65">
        {isKo
          ? "시드에 있는 CPC/CPM 공개 범위로만 계산합니다. 전환율은 추정하지 않습니다."
          : "Calculated from seeded CPC/CPM ranges only — no conversion estimates."}
      </p>
      <p className="mt-2 text-sm font-semibold text-[color:var(--qp-accent)]">
        {onlinePricingLabel(spec)}
      </p>

      <label className="mt-4 block space-y-1.5">
        <span className="text-sm font-semibold text-gray-600 dark:text-white/70">
          {isKo ? "월 예산" : "Monthly budget"}
        </span>
        <input
          type="number"
          min={spec.minBudget ?? 100_000}
          step={100_000}
          value={budgetWon}
          onChange={(e) => {
            const n = Number(e.target.value);
            setBudgetWon(Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
          }}
          className={inputCls}
        />
      </label>

      {belowMin ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {isKo
            ? `최소 집행금액 ${spec.minBudget.toLocaleString("ko-KR")}원 이상 입력해 주세요.`
            : `Enter at least ₩${spec.minBudget.toLocaleString("en-US")} (minimum budget).`}
        </p>
      ) : null}

      {estimate ? (
        <ul className="mt-4 space-y-2 text-sm dark:text-white/85 text-gray-800">
          {estimate.reachMin != null && estimate.reachMax != null ? (
            <li>
              {isKo ? "예상 도달" : "Est. reach"}{" "}
              <strong className="tabular-nums">
                {estimate.reachMin.toLocaleString(locale)}~
                {estimate.reachMax.toLocaleString(locale)}
              </strong>
            </li>
          ) : null}
          {estimate.clicksMin != null && estimate.clicksMax != null ? (
            <li>
              {isKo ? "예상 클릭" : "Est. clicks"}{" "}
              <strong className="tabular-nums">
                {estimate.clicksMin.toLocaleString(locale)}~
                {estimate.clicksMax.toLocaleString(locale)}
              </strong>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-white/55">
          {isKo ? "예산을 입력하면 범위를 보여줍니다." : "Enter a budget to see ranges."}
        </p>
      )}

      {estimate ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-white/50">
          {isKo ? "근거:" : "Basis:"} {estimate.basis.join(" · ")}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3 text-sm">
        <p className="flex justify-between gap-2 dark:text-white/80 text-gray-700">
          <span>{isKo ? "예상 집행 비용" : "Est. spend"}</span>
          <span className="font-bold tabular-nums dark:text-white text-gray-900">
            {belowMin
              ? mediaPriceOnInquiryLabel(isKo ? "ko" : "en")
              : formatMediaCostEstimateShort(
                  budgetWon,
                  media.country,
                  locale,
                  media,
                )}
          </span>
        </p>
      </div>
    </section>
  );
}
