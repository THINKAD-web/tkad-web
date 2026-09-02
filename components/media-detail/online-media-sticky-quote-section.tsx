"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaCostEstimateShort } from "@/lib/media-display-currency";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import {
  estimatePerformance,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";

type Props = {
  media: MediaItem;
  isKo: boolean;
  displayName: string;
  contactHref: string;
  inputCls: string;
};

export function OnlineMediaStickyQuoteSection({
  media,
  isKo,
  displayName,
  contactHref,
  inputCls,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const spec = media.onlineSpec;
  const calculable = hasOnlinePricingSpec(media);
  const defaultBudget = spec?.minBudget ?? 1_000_000;
  const [budgetWon, setBudgetWon] = useState(defaultBudget);

  const estimate = useMemo(
    () => (spec && calculable ? estimatePerformance(spec, budgetWon) : null),
    [spec, calculable, budgetWon],
  );

  const belowMin =
    calculable &&
    spec != null &&
    spec.minBudget > 0 &&
    budgetWon > 0 &&
    budgetWon < spec.minBudget;

  const headline = calculable && spec
    ? onlinePricingLabel(spec)
    : mediaPriceOnInquiryLabel(isKo ? "ko" : "en");

  return (
    <>
      <p className="truncate text-[length:var(--qp-text-body)] font-bold dark:text-white text-gray-900">
        {displayName}
      </p>
      <p className="mt-1 text-lg font-bold leading-snug text-[color:var(--qp-accent)]">
        {headline}
      </p>
      {calculable ? (
        <p className="text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
          {isKo ? "참고 단가 (CPC/CPM 시드 범위)" : "Reference rates (seeded CPC/CPM range)"}
        </p>
      ) : null}

      <div className="mt-5 space-y-3 border-t dark:border-white/10 border-gray-100 pt-5">
        {calculable ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
                {isKo ? "월 예산" : "Monthly budget"}
              </span>
              <input
                type="number"
                min={spec?.minBudget ?? 100_000}
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
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--qp-text-meta)] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                {isKo
                  ? `최소 집행금액 ${spec!.minBudget.toLocaleString("ko-KR")}원 이상 입력해 주세요.`
                  : `Enter at least ₩${spec!.minBudget.toLocaleString("en-US")} (minimum budget).`}
              </p>
            ) : null}

            <div className="rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3 text-[length:var(--qp-text-body)]">
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
              {!belowMin && estimate?.reachMin != null && estimate.reachMax != null ? (
                <p className="mt-1 flex justify-between gap-2 dark:text-white/60 text-gray-500">
                  <span>{isKo ? "예상 도달" : "Est. reach"}</span>
                  <span className="tabular-nums">
                    {estimate.reachMin.toLocaleString(locale)}~
                    {estimate.reachMax.toLocaleString(locale)}
                  </span>
                </p>
              ) : null}
              {!belowMin && estimate?.clicksMin != null && estimate.clicksMax != null ? (
                <p className="mt-1 flex justify-between gap-2 dark:text-white/60 text-gray-500">
                  <span>{isKo ? "예상 클릭" : "Est. clicks"}</span>
                  <span className="tabular-nums">
                    {estimate.clicksMin.toLocaleString(locale)}~
                    {estimate.clicksMax.toLocaleString(locale)}
                  </span>
                </p>
              ) : null}
            </div>
            <p className="text-[length:var(--qp-text-meta)] text-gray-500 dark:text-white/55">
              {isKo
                ? "시드 CPC/CPM 범위로만 계산합니다. 전환율은 추정하지 않습니다."
                : "Based on seeded CPC/CPM ranges only — no invented conversion rates."}
            </p>
          </>
        ) : null}

        <Link
          href={contactHref}
          data-accent-keep="true"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[color:var(--qp-accent)] px-3 text-center text-sm font-bold text-white"
        >
          {isKo ? "문의하기" : "Contact us"}
        </Link>
      </div>
    </>
  );
}
