"use client";

import {
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  Ruler,
  Tag,
  Users,
  Radio,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
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
  /** 플래너 보고서 등 — 썸네일 확대 (compact 보다 우선하지 않음) */
  largeThumb?: boolean;
  /** 설정 시 카드 전체가 매체 상세 페이지로 연결됨 */
  mediaPageHref?: string;
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
  largeThumb = false,
  mediaPageHref,
}: Props) {
  const showContributionBars =
    showContribution &&
    (portfolioSize == null || portfolioSize > 1) &&
    (detail.exposureContributionPct != null ||
      detail.budgetContributionPct !== undefined);

  const cardClassName = cn(
    "flex gap-3 overflow-hidden rounded-xl border bg-white p-4 shadow-sm sm:gap-4 sm:p-5",
    className,
  );

  const inner = (
    <>
      <div
        className={cn(
          // 고정 4:3 비율 박스 — 폭만 반응형, 세로 늘어남 불가
          "relative aspect-[4/3] shrink-0 self-start overflow-hidden rounded-xl shadow-sm",
          compact ? "w-24 sm:w-28" : largeThumb ? "w-48 sm:w-64" : "w-28 sm:w-40",
        )}
        style={{ background: LIGHT.bgAlt }}
      >
        {detail.thumbUrl ? (
          // html2canvas(PDF)는 object-fit 을 무시하므로 background-size:cover 로 렌더
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
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF]">
            {isKo ? "이미지 없음" : "No image"}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h4
            className="text-base font-bold leading-snug tracking-[-0.02em] text-[#111827] break-words"
            style={{ fontWeight: 700 }}
          >
            {detail.name}
            {detail.quantityLabel ? (
              <span className="ml-1.5 text-sm font-semibold tabular-nums text-[#7C3AED]">
                · {detail.quantityLabel}
              </span>
            ) : null}
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
              label={isKo ? "일 유동인구" : "Daily footfall"}
              value={`${detail.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`}
            />
          ) : null}
          {detail.adjustedDailyReach != null && detail.adjustedDailyReach > 0 ? (
            <SpecRow
              icon={Eye}
              label={isKo ? "일 실노출(추정)" : "Daily reach (est.)"}
              value={`${detail.adjustedDailyReach.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`}
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
            {detail.budgetContributionPct !== undefined ? (
              detail.budgetContributionPct != null ? (
                <ContributionBar
                  label={isKo ? "예산 비중" : "Budget share"}
                  pct={detail.budgetContributionPct}
                  color="#7C3AED"
                />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#6B7280]">
                    {isKo ? "예산 비중" : "Budget share"}
                  </p>
                  <p className="text-sm font-semibold text-[#374151]">—</p>
                </div>
              )
            ) : null}
          </div>
        ) : null}

        {mediaPageHref ? (
          <div className="flex justify-end border-t pt-3" style={{ borderColor: LIGHT.divider }}>
            <Link
              href={mediaPageHref}
              className="tkad-document-cta inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#6D28D9]"
            >
              {isKo ? "매체 상세 보기" : "View media page"}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={cardClassName}
      style={{ borderColor: LIGHT.border, background: LIGHT.bg }}
    >
      {inner}
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
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: LIGHT.border, background: LIGHT.bgAlt }}
          >
            {detail.thumbUrl ? (
              // html2canvas(PDF)는 object-fit 을 무시하므로 background-size:cover 로 렌더
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
