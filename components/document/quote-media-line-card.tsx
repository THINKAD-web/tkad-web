"use client";

import { Clock, MapPin, Radio, Ruler, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";

type SpecItem = {
  key: string;
  icon: typeof MapPin;
  label: string;
  value: string;
  tone?: "cyan" | "default";
};

type CardProps = {
  detail: DocumentMediaDetail;
  isKo?: boolean;
  className?: string;
};

/** 부가비용·제작비 — 매체 카드와 좌우·가격 컬럼 정렬 일치 */
export function QuoteAddonLineRow({ detail, isKo = true, className }: CardProps) {
  return (
    <article
      className={cn(
        "flex gap-3 overflow-hidden rounded-xl border border-dashed border-gray-200 bg-white p-3 shadow-sm",
        className,
      )}
    >
      <div className="w-[7.5rem] shrink-0 sm:w-32" aria-hidden />
      <h4 className="min-w-0 flex-1 self-center text-[13px] font-semibold leading-snug text-gray-900">
        {detail.name}
      </h4>
      {(detail.monthlyPriceLabel || detail.lineTotalLabel) && (
        <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-gray-100 pl-3 text-right">
          {detail.monthlyPriceLabel ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                {isKo ? "단가" : "Unit"}
              </p>
            <p className="text-[12px] font-bold tabular-nums text-gray-900">
              {detail.monthlyPriceLabel}
            </p>
            </div>
          ) : null}
          {detail.lineTotalLabel ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                {isKo ? "소계" : "Subtotal"}
              </p>
              <p className="text-[13px] font-extrabold tabular-nums text-violet-700">
                {detail.lineTotalLabel}
              </p>
            </div>
          ) : null}
          {detail.executionPeriodLabel ? (
            <p className="max-w-[9rem] text-[10px] leading-snug text-gray-500">
              {detail.executionPeriodLabel}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

/** admin 커스텀 라인(제작비 등) — 매체 카드와 구분 */
export function isQuoteAddonRow(row: { id: string }): boolean {
  return isQuoteAddonLineId(row.id);
}

/** 견적서(default) 매체 라인 — 플래너 카드 톤, 분석 지표 없이 단가·소계 중심 */
export function QuoteMediaLineCard({ detail, isKo = true, className }: CardProps) {
  const specs: SpecItem[] = [];
  if (detail.categoryLabel) {
    specs.push({
      key: "cat",
      icon: MapPin,
      label: isKo ? "유형" : "Type",
      value: detail.categoryLabel,
    });
  }
  if (detail.quantityLabel) {
    specs.push({
      key: "qty",
      icon: Ruler,
      label: isKo ? "수량" : "Qty",
      value: detail.quantityLabel,
      tone: "cyan",
    });
  }
  if (detail.size) {
    specs.push({
      key: "size",
      icon: Ruler,
      label: isKo ? "규격" : "Size",
      value: detail.size,
    });
  }
  if (detail.operatingHours) {
    specs.push({
      key: "hours",
      icon: Clock,
      label: isKo ? "운영" : "Hours",
      value: detail.operatingHours,
    });
  }
  if (detail.dailyTraffic != null && detail.dailyTraffic > 0) {
    specs.push({
      key: "traffic",
      icon: Users,
      label: isKo ? "일일 노출" : "Daily",
      value: `${detail.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`,
      tone: "cyan",
    });
  }
  if (detail.broadcastLabel) {
    specs.push({
      key: "broadcast",
      icon: Radio,
      label: isKo ? "송출" : "Spot",
      value: detail.broadcastLabel,
    });
  }

  const showThumb = Boolean(detail.thumbUrl?.trim());

  return (
    <article
      className={cn(
        "flex min-w-[17rem] gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:min-w-0",
        className,
      )}
    >
      {showThumb ? (
        <div
          className="relative aspect-[4/3] w-[7.5rem] shrink-0 self-start overflow-hidden rounded-lg shadow-sm sm:w-32"
          style={{ background: "#F8F9FC" }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${detail.thumbUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 py-0.5">
        <h4 className="text-[13px] font-bold leading-snug tracking-tight text-gray-900">
          {detail.name}
        </h4>
        {detail.location ? (
          <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-gray-500">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span className="line-clamp-2">{detail.location}</span>
          </p>
        ) : null}
        {specs.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
            {specs.map((s) => (
              <li
                key={s.key}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] leading-snug",
                  s.tone === "cyan" ? "text-cyan-700" : "text-gray-600",
                )}
              >
                <s.icon className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
                <span className="text-gray-400">{s.label}</span>
                <span
                  className={cn(
                    "font-medium",
                    s.tone === "cyan" ? "text-cyan-700" : "text-gray-700",
                  )}
                >
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {(detail.monthlyPriceLabel || detail.lineTotalLabel) && (
        <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-gray-100 pl-3 text-right">
          {detail.monthlyPriceLabel ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                {isKo ? "단가" : "Unit"}
              </p>
            <p className="text-[12px] font-bold tabular-nums text-gray-900">
              {detail.monthlyPriceLabel}
            </p>
            </div>
          ) : null}
          {detail.lineTotalLabel ? (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                {isKo ? "소계" : "Subtotal"}
              </p>
              <p className="text-[13px] font-extrabold tabular-nums text-violet-700">
                {detail.lineTotalLabel}
              </p>
            </div>
          ) : null}
          {detail.executionPeriodLabel ? (
            <p className="max-w-[9rem] text-[10px] leading-snug text-gray-500">
              {detail.executionPeriodLabel}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}
