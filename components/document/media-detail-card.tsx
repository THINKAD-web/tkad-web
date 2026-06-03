"use client";

import {
  Clock,
  MapPin,
  Ruler,
  Tag,
  Users,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";

const LIGHT = {
  bg: "#FFFFFF",
  bgAlt: "#F8F9FC",
  border: "#E5E7EB",
  title: "#111827",
  sub: "#6B7280",
  accent: "#7C3AED",
  divider: "#F0F0F0",
} as const;

type Props = {
  detail: DocumentMediaDetail;
  isKo?: boolean;
  className?: string;
  /** 플래너 보고서: 기여도 막대 (매체 2개 이상일 때만 의미 있음) */
  showContribution?: boolean;
  /** 포트폴리오 매체 수 — 1개면 기여도 막대 숨김 */
  portfolioSize?: number;
  compact?: boolean;
};

function SpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-[#374151]">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
      <span className="text-[#6B7280]">{label}</span>
      <span className="min-w-0 flex-1 font-medium tabular-nums text-[#111827] line-clamp-2">
        {value}
      </span>
    </div>
  );
}

function ContributionBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-[#6B7280]">{label}</span>
        <span className="font-semibold tabular-nums text-[#111827]">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function MediaDetailCard({
  detail,
  isKo = true,
  className,
  showContribution = false,
  portfolioSize,
  compact = false,
}: Props) {
  const showContributionBars =
    showContribution &&
    (portfolioSize == null || portfolioSize > 1) &&
    (detail.exposureContributionPct != null || detail.budgetContributionPct != null);
  const imgW = compact ? 120 : 160;
  const imgH = compact ? 90 : 120;

  return (
    <article
      className={cn(
        "flex gap-4 rounded-xl border bg-white p-5 shadow-sm",
        className,
      )}
      style={{ borderColor: LIGHT.border, background: LIGHT.bg }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-xl shadow-sm"
        style={{ width: imgW, height: imgH, background: LIGHT.bgAlt }}
      >
        {detail.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.thumbUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF]">
            {isKo ? "이미지 없음" : "No image"}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h4
            className="text-base font-bold leading-snug tracking-[-0.02em] text-[#111827]"
            style={{ fontWeight: 700 }}
          >
            {detail.name}
          </h4>
          {detail.location ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B7280]">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">{detail.location}</span>
            </p>
          ) : null}
          {detail.categoryLabel ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B7280]">
              <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{detail.categoryLabel}</span>
            </p>
          ) : null}
        </div>

        <div
          className="grid grid-cols-1 gap-1.5 border-t pt-3 sm:grid-cols-2"
          style={{ borderColor: LIGHT.divider }}
        >
          {detail.size ? (
            <SpecRow icon={Ruler} label={isKo ? "규격" : "Size"} value={detail.size} />
          ) : null}
          {detail.operatingHours ? (
            <SpecRow
              icon={Clock}
              label={isKo ? "운영시간" : "Hours"}
              value={detail.operatingHours}
            />
          ) : null}
          {detail.dailyTraffic != null && detail.dailyTraffic > 0 ? (
            <SpecRow
              icon={Users}
              label={isKo ? "일일 노출" : "Daily reach"}
              value={`${detail.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`}
            />
          ) : null}
          {detail.broadcastLabel ? (
            <SpecRow icon={Radio} label={isKo ? "송출" : "Spot"} value={detail.broadcastLabel} />
          ) : null}
        </div>

        {(detail.monthlyPriceLabel || detail.lineTotalLabel) && (
          <div
            className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3"
            style={{ borderColor: LIGHT.divider }}
          >
            {detail.monthlyPriceLabel ? (
              <div>
                <p className="text-[11px] font-medium text-[#6B7280]">
                  {isKo ? "월 단가" : "Monthly"}
                </p>
                <p className="text-sm font-semibold tabular-nums text-[#7C3AED]">
                  {detail.monthlyPriceLabel}
                </p>
              </div>
            ) : null}
            {detail.lineTotalLabel ? (
              <div className="text-right">
                <p className="text-[11px] font-medium text-[#6B7280]">
                  {isKo ? "집행 소계" : "Subtotal"}
                </p>
                <p className="text-sm font-semibold tabular-nums text-[#7C3AED]">
                  {detail.lineTotalLabel}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {detail.recommendReason ? (
          <p className="text-sm leading-relaxed text-[#374151]">
            <span className="font-semibold text-[#7C3AED]">
              {isKo ? "추천 " : "Why "}
            </span>
            {detail.recommendReason}
          </p>
        ) : null}

        {showContributionBars ? (
          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2" style={{ borderColor: LIGHT.divider }}>
            {detail.exposureContributionPct != null ? (
              <ContributionBar
                label={isKo ? "노출 기여" : "Exposure share"}
                pct={detail.exposureContributionPct}
                color="#06B6D4"
              />
            ) : null}
            {detail.budgetContributionPct != null ? (
              <ContributionBar
                label={isKo ? "예산 비중" : "Budget share"}
                pct={detail.budgetContributionPct}
                color="#7C3AED"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** 견적서 테이블 행 — 썸네일 + 서브텍스트 */
export function MediaDetailTableRow({
  detail,
  index,
  unitPriceLabel,
  lineTotalLabel,
  isKo = true,
}: {
  detail: DocumentMediaDetail;
  index: number;
  unitPriceLabel: string;
  lineTotalLabel: string;
  isKo?: boolean;
}) {
  const subParts = [
    detail.size ? `${isKo ? "규격" : "Size"} ${detail.size}` : null,
    detail.operatingHours
      ? `${isKo ? "운영" : "Hours"} ${detail.operatingHours}`
      : null,
    detail.dailyTraffic
      ? `${isKo ? "일일" : "Daily"} ${detail.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}`
      : null,
  ].filter(Boolean);

  return (
    <tr className="border-b align-top" style={{ borderColor: LIGHT.divider }}>
      <td className="px-2 py-4 text-center text-xs text-[#6B7280]">{index}</td>
      <td className="px-2 py-4">
        <div className="flex gap-3">
          <div
            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: LIGHT.border, background: LIGHT.bgAlt }}
          >
            {detail.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.thumbUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
                decoding="sync"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-bold tracking-[-0.02em] text-[#111827]">{detail.name}</p>
            {detail.location ? (
              <p className="mt-0.5 text-[11px] text-[#6B7280]">{detail.location}</p>
            ) : null}
            {subParts.length > 0 ? (
              <p className="mt-1 text-[10px] leading-relaxed text-[#6B7280]">
                {subParts.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-2 py-4 text-right text-sm tabular-nums text-[#374151]">
        {unitPriceLabel}
      </td>
      <td className="px-2 py-4 text-right text-sm font-semibold tabular-nums text-[#7C3AED]">
        {lineTotalLabel}
      </td>
    </tr>
  );
}
