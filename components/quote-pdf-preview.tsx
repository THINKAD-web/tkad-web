"use client";

import { forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";
import {
  formatQuoteAmount,
  type QuoteAmountDisplayUnit,
} from "@/lib/document-text";
import { formatAdminQuoteLineCell } from "@/lib/admin-quote-inquiry";
import { QuoteMediaLineCard, QuoteAddonLineRow, isQuoteAddonRow } from "@/components/document/quote-media-line-card";
import { MediaDetailCard } from "@/components/document/media-detail-card";
import {
  documentCardClass,
  DocumentGradientHero,
  DocumentSectionHeading,
} from "@/components/document/document-layout";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import { QuoteStampImage } from "@/components/quote/quote-stamp-image";
import { formatQuoteValidUntilLabel } from "@/lib/admin-quote-calc";
import { formatCampaignDurationMeta } from "@/lib/quote-campaign-period";

/** 카드 대신 컴팩트 표로 전환하는 매체 건수 */
const COMPACT_MEDIA_MIN = 5;

const QUOTE_DOC_FONT =
  "var(--font-pretendard), Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif";

function QuoteDocSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-gray-900",
        className,
      )}
    >
      <span
        className="inline-block h-[18px] w-[3px] shrink-0 rounded-full bg-gradient-to-b from-violet-600 to-cyan-500"
        aria-hidden
      />
      {children}
    </h3>
  );
}

/** 기본 견적서: 섹션 제목(좌) + 내용(우) 가로 배치 */
function QuoteDocSectionRow({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex items-start gap-5 border-b border-gray-100 pb-4 mb-4 sm:gap-7",
        className,
      )}
    >
      <div className="w-[5.5rem] shrink-0 pt-0.5 sm:w-24">{title}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

function QuoteInlineField({
  label,
  children,
  emphasis,
  className,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-baseline gap-1.5", className)}>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </span>
      <span
        className={cn(
          "break-words text-[15px] text-gray-900",
          emphasis ? "font-bold" : "font-semibold",
        )}
      >
        {children}
      </span>
    </span>
  );
}

function QuoteSummaryStrip({
  isKo,
  grandTotalWon,
  validityText,
  formatAmount,
}: {
  isKo: boolean;
  grandTotalWon: number;
  validityText: string;
  formatAmount: (won: number) => string;
}) {
  const thinkadContact = isKo ? "견적·제안 · 02-515-2772" : "Sales · 02-515-2772";

  return (
    <div
      className="border-b border-gray-100 bg-white px-5 pt-6 pb-4 sm:px-7"
      data-quote-summary-strip
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-200/70 bg-white/90 px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500">
            {isKo ? "총액 (VAT 포함)" : "Total (incl. VAT)"}
          </p>
          <p className="quote-pdf-amount mt-1 text-2xl font-black tabular-nums tracking-tight text-violet-700">
            {formatAmount(grandTotalWon)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white/80 px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {isKo ? "유효기간" : "Valid until"}
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-gray-900">{validityText}</p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white/80 px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {isKo ? "싱커드 담당" : "THINKAD"}
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-gray-900">{thinkadContact}</p>
        </div>
      </div>
    </div>
  );
}

function QuoteDefaultTotalsPanel({
  isKo,
  subtotalWon,
  vatWon,
  grandTotalWon,
  linesSubtotalWon,
  discountTotalWon,
  discountSummary,
  showDiscountBreakdown,
  supplyLabel,
  vatLabel,
  formatAmount,
}: {
  isKo: boolean;
  subtotalWon: number;
  vatWon: number;
  grandTotalWon: number;
  linesSubtotalWon?: number;
  discountTotalWon?: number;
  discountSummary?: string;
  showDiscountBreakdown: boolean;
  supplyLabel: string;
  vatLabel: string;
  formatAmount: (won: number) => string;
}) {
  return (
    <div className="w-full space-y-1.5 rounded-xl border border-gray-200/50 bg-white p-4 text-[15px]">
      {showDiscountBreakdown && linesSubtotalWon != null && linesSubtotalWon > 0 ? (
        <div className="flex justify-between gap-6">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {isKo ? "소계" : "Subtotal"}
          </span>
          <span className="font-bold tabular-nums text-gray-900">
            {formatAmount(linesSubtotalWon)}
          </span>
        </div>
      ) : null}
      {showDiscountBreakdown && (discountTotalWon ?? 0) > 0 ? (
        <div className="flex justify-between gap-6 text-red-700">
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            {discountSummary ?? (isKo ? "할인" : "Discount")}
          </span>
          <span className="font-bold tabular-nums">
            −{formatAmount(discountTotalWon!)}
          </span>
        </div>
      ) : null}
      <div className="flex justify-between gap-6">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {supplyLabel}
        </span>
        <span className="font-bold tabular-nums text-gray-900 quote-pdf-amount">
          {formatAmount(subtotalWon)}
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {vatLabel}
        </span>
        <span className="font-bold tabular-nums text-gray-900 quote-pdf-amount">
          {formatAmount(vatWon)}
        </span>
      </div>
      <div
        className="quote-pdf-totals-gradient flex items-center justify-between gap-6 rounded-lg px-4 py-3 text-base font-black text-white"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
        }}
      >
        <span>{isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)"}</span>
        <span className="quote-pdf-amount tabular-nums">
          {formatAmount(grandTotalWon)}
        </span>
      </div>
    </div>
  );
}

function QuoteMediaCompactTable({
  rows,
  isKo,
  formatAmount,
}: {
  rows: QuotePdfPreviewRow[];
  isKo: boolean;
  formatAmount: (won: number) => string;
}) {
  const tHead = isKo
    ? ["#", "매체명", "위치", "소계"]
    : ["#", "Media", "Location", "Amount"];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-violet-100 bg-violet-50/70">
            {tHead.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800",
                  i === 3 && "text-right",
                  i === 0 && "w-8",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.rowKey ?? `${row.id}-${idx}`}
              className="border-b border-gray-100 last:border-0 even:bg-gray-50/60"
            >
              <td className="px-3 py-2.5 text-xs font-medium tabular-nums text-gray-400">
                {idx + 1}
              </td>
              <td className="px-3 py-2.5 text-sm font-bold leading-snug text-gray-900">
                {row.name}
              </td>
              <td className="px-3 py-2.5 text-xs leading-snug text-gray-500">
                {row.location || "—"}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-violet-700">
                {formatAdminQuoteLineCell(row.lineTotalWon, isKo, (n) =>
                  formatAmount(n),
                {
                  priceOnInquiry: row.priceOnInquiry,
                  unitPriceWon: row.unitPriceWon,
                  lineTotalWon: row.lineTotalWon,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type QuotePdfPreviewRow = {
  /** React list key — 동일 mediaId 다중 라인 시 `lineId` 등 유일값 */
  rowKey?: string;
  id: string;
  thumbUrl: string | null;
  name: string;
  location: string;
  /** 단가 (원). 만원 단위로 표시될 때만 round 적용. */
  unitPriceWon: number;
  /** 라인 합계 (원). */
  lineTotalWon: number;
  /** 카탈로그 단가 ≤0 · override 없음 → 「별도 문의」/「가격 문의」 */
  priceOnInquiry?: boolean;
  /** 공개 견적 위저드 — priceOnInquiry 시 표시 라벨 (기본: admin 「별도 문의」) */
  inquiryLabel?: string;
  /** 단가 기간 라벨 (예: 2주, 월) */
  unitPeriodLabel?: string;
  /** 집행 기간 라벨 (행별) */
  executionPeriodLabel?: string;
  /** 추가 스펙 */
  size?: string | null;
  dailyFootTraffic?: number | null;
  visibilityScore?: number | null;
  operatingHours?: string | null;
  categoryLabel?: string | null;
  broadcastLabel?: string | null;
};

type Props = {
  template: QuoteTemplateId;
  /** 공식 견적서 등 제목 오버라이드 (예: 공식 견적서) */
  documentHeading?: string;
  customerLogoSrc: string | null;
  company: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  periodLabel: string;
  /** 집행 기간 표기에 사용 (예: × 3개월) */
  periodMonths: number;
  /** 기간 단위 라벨 (예: "2주", "주", "일"). 미지정 시 "{n}개월" 사용 */
  periodUnitLabel?: string | null;
  rows: QuotePdfPreviewRow[];
  /** 공급가/부가세/총계 (원). 표시 직전 한 번만 만원 변환 → round 누적 손실 방지. */
  subtotalWon: number;
  vatWon: number;
  grandTotalWon: number;
  issuedAt: Date;
  /** 견적번호 (admin·저장 견적) */
  quoteNumber?: string;
  /** 유효기간 — 없으면 기본 14일 문구 */
  validUntil?: Date | string;
  /** 할인 전 소계 (admin) */
  linesSubtotalWon?: number;
  discountTotalWon?: number;
  discountSummary?: string;
  vatIncluded?: boolean;
  /** admin 카드형: 공식 견적서와 동일하게 원 표기 */
  amountUnit?: QuoteAmountDisplayUnit;
};

export const QuotePdfPreview = forwardRef<HTMLDivElement, Props>(
  function QuotePdfPreview(
    {
      template,
      documentHeading,
      customerLogoSrc,
      company,
      contactName,
      contactPhone,
      contactEmail,
      periodLabel,
      rows,
      subtotalWon,
      vatWon,
      grandTotalWon,
      issuedAt,
      quoteNumber,
      validUntil,
      linesSubtotalWon,
      discountTotalWon,
      discountSummary,
      amountUnit = "manwon",
    },
    ref,
  ) {
    const t = useTranslations("quote");
    const locale = useLocale();
    const isKo = locale === "ko";
    const formatAmount = (won: number) =>
      formatQuoteAmount(won, isKo, amountUnit);
    const dateStr = new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(issuedAt);

    const heading = documentHeading?.trim() || t("pdfDocHeading");
    const quoteNo = quoteNumber?.trim();
    const subtitleParts = [
      quoteNo,
      periodLabel,
      `${isKo ? "발행" : "Issued"} ${dateStr}`,
    ].filter(Boolean);
    const subtitle = subtitleParts.join(" · ");

    const showDiscountBreakdown =
      (discountTotalWon ?? 0) > 0 ||
      (linesSubtotalWon != null &&
        linesSubtotalWon > 0 &&
        linesSubtotalWon !== subtotalWon);

    const validityText = validUntil
      ? formatQuoteValidUntilLabel(validUntil, isKo)
      : t("pdfValidity");

    const campaignDurationMeta = formatCampaignDurationMeta(periodLabel, isKo);

    const isPremium = template === "premium";
    const isDefaultDoc = !isPremium;
    const useCompactMedia = isDefaultDoc && rows.length >= COMPACT_MEDIA_MIN;
    const SectionHeading = isDefaultDoc ? QuoteDocSectionHeading : DocumentSectionHeading;

    return (
      <div
        ref={ref}
        className={cn(
          documentCardClass,
          "quote-pdf-preview-doc box-border w-full min-w-0 antialiased",
          "overflow-x-auto overflow-y-visible",
          "md:w-[210mm] md:max-w-[210mm]",
        )}
        data-quote-pdf-background="#ffffff"
        style={{
          fontFamily: isDefaultDoc
            ? QUOTE_DOC_FONT
            : "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        }}
      >
        <DocumentGradientHero
          badge={isPremium ? "PREMIUM QUOTE" : "ADVERTISING QUOTE"}
          title={heading}
          subtitle={subtitle}
          topAccent={isPremium ? "gold" : "none"}
          className={isDefaultDoc ? "[&_h2]:text-[1.75rem] sm:[&_h2]:text-[2rem]" : undefined}
        />

        {isDefaultDoc ? (
          <QuoteSummaryStrip
            isKo={isKo}
            grandTotalWon={grandTotalWon}
            validityText={validityText}
            formatAmount={formatAmount}
          />
        ) : null}

        <div
          className={cn(
            isDefaultDoc ? "space-y-0 px-5 py-5 sm:px-7" : "space-y-8 px-6 py-8 sm:px-9",
          )}
        >
          {customerLogoSrc ? (
            <div className={cn("flex justify-end", isDefaultDoc && "pb-6")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customerLogoSrc}
                alt=""
                className="max-h-12 max-w-[140px] object-contain"
              />
            </div>
          ) : null}

          {isDefaultDoc ? (
            <QuoteDocSectionRow
              title={<SectionHeading>{t("pdfClientSection")}</SectionHeading>}
              className="items-center"
            >
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:gap-x-5">
                <QuoteInlineField label={t("company")} emphasis>
                  {company.trim() || "—"}
                </QuoteInlineField>
                <QuoteInlineField label={t("name")}>
                  {contactName.trim() || "—"}
                </QuoteInlineField>
                <QuoteInlineField label={t("phone")}>
                  {contactPhone.trim() || "—"}
                </QuoteInlineField>
                {contactEmail.trim() ? (
                  <QuoteInlineField label={t("email")} className="break-all">
                    {contactEmail.trim()}
                  </QuoteInlineField>
                ) : null}
              </p>
            </QuoteDocSectionRow>
          ) : (
            <section className="space-y-4 mb-0">
              <SectionHeading>{t("pdfClientSection")}</SectionHeading>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4 sm:grid-cols-4">
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500">{t("company")}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-gray-900">
                    {company.trim() || "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">{t("name")}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                    {contactName.trim() || "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">{t("phone")}</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{contactPhone.trim() || "—"}</dd>
                </div>
                {contactEmail.trim() ? (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500">{t("email")}</dt>
                    <dd className="mt-0.5 break-all text-sm text-gray-900">
                      {contactEmail.trim()}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          )}

          {isDefaultDoc ? (
            <QuoteDocSectionRow
              title={<SectionHeading>{t("pdfCampaignSection")}</SectionHeading>}
              className="items-center"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-bold tracking-tight text-gray-900">
                  {periodLabel}
                </span>
                {campaignDurationMeta ? (
                  <span className="text-sm font-semibold tabular-nums text-violet-700">
                    · {campaignDurationMeta}
                  </span>
                ) : null}
              </div>
            </QuoteDocSectionRow>
          ) : (
            <section className="space-y-4 mb-0">
              <SectionHeading>{t("pdfCampaignSection")}</SectionHeading>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4">
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">{t("period")}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">{periodLabel}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">
                    {isKo ? "금액 단위" : "Amount unit"}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-600">
                    {amountUnit === "won"
                      ? isKo
                        ? "금액 표시 단위: 원 (KRW)"
                        : "Amounts in KRW (won)"
                      : t("pdfAmountUnitNote")}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section
            className={cn(isDefaultDoc && "border-b border-gray-100 pb-4 mb-4")}
          >
            <div className={isDefaultDoc ? "mb-2.5" : "space-y-4 mb-0"}>
              <SectionHeading>{t("pdfMediaSection")}</SectionHeading>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center text-sm text-gray-500">
                {isKo ? "선택된 매체가 없습니다." : "No media selected."}
              </p>
            ) : useCompactMedia ? (
              <QuoteMediaCompactTable
                rows={rows}
                isKo={isKo}
                formatAmount={formatAmount}
              />
            ) : (
              <ul className={cn(isDefaultDoc ? "space-y-2" : "space-y-4")}>
                {rows.map((row, idx) => {
                  const cellOpts = {
                    priceOnInquiry: row.priceOnInquiry,
                    unitPriceWon: row.unitPriceWon,
                    lineTotalWon: row.lineTotalWon,
                    inquiryLabel: row.inquiryLabel,
                  };
                  const unitFormatted = formatAdminQuoteLineCell(
                    row.unitPriceWon,
                    isKo,
                    (n) => formatAmount(n),
                    cellOpts,
                  );
                  const unitLabel = row.unitPeriodLabel
                    ? row.priceOnInquiry ||
                      (row.unitPriceWon <= 0 && row.lineTotalWon <= 0)
                      ? unitFormatted
                      : `${unitFormatted} / ${row.unitPeriodLabel}`
                    : unitFormatted;
                  const isAddon = isQuoteAddonRow(row);
                  const detail: DocumentMediaDetail = {
                    id: row.id,
                    name: row.name,
                    location:
                      isAddon || !row.location?.trim() || row.location === "—"
                        ? undefined
                        : row.location,
                    thumbUrl: isAddon ? null : row.thumbUrl,
                    categoryLabel: row.categoryLabel ?? undefined,
                    size: row.size ?? undefined,
                    operatingHours: row.operatingHours ?? undefined,
                    dailyTraffic: row.dailyFootTraffic ?? undefined,
                    broadcastLabel: row.broadcastLabel ?? undefined,
                    monthlyPriceLabel: unitLabel,
                    lineTotalLabel: formatAdminQuoteLineCell(
                      row.lineTotalWon,
                      isKo,
                      (n) => formatAmount(n),
                      cellOpts,
                    ),
                    executionPeriodLabel: row.executionPeriodLabel ?? undefined,
                  };
                  return (
                    <li key={row.rowKey ?? `${row.id}-${idx}`}>
                      {isDefaultDoc ? (
                        isAddon ? (
                          <QuoteAddonLineRow detail={detail} isKo={isKo} />
                        ) : (
                          <QuoteMediaLineCard detail={detail} isKo={isKo} />
                        )
                      ) : (
                        <MediaDetailCard detail={detail} isKo={isKo} compact />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={cn(isDefaultDoc && "pb-1")}>
            <div className={isDefaultDoc ? "mb-2.5" : "space-y-4 mb-0"}>
              <SectionHeading>{t("pdfTotal")}</SectionHeading>
            </div>
            {isDefaultDoc ? (
              <QuoteDefaultTotalsPanel
                isKo={isKo}
                subtotalWon={subtotalWon}
                vatWon={vatWon}
                grandTotalWon={grandTotalWon}
                linesSubtotalWon={linesSubtotalWon}
                discountTotalWon={discountTotalWon}
                discountSummary={discountSummary}
                showDiscountBreakdown={showDiscountBreakdown}
                supplyLabel={t("pdfSupply")}
                vatLabel={t("pdfVat")}
                formatAmount={formatAmount}
              />
            ) : showDiscountBreakdown ? (
              <div
                className={cn(
                  "mx-auto max-w-md space-y-2 rounded-xl border p-4",
                  isDefaultDoc
                    ? "border-gray-200 bg-gray-50/80 text-[15px] shadow-sm"
                    : "border-gray-200 bg-gray-50 text-sm",
                )}
              >
                {linesSubtotalWon != null && linesSubtotalWon > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {isKo ? "소계" : "Subtotal"}
                    </span>
                    <span className="font-bold tabular-nums text-violet-700">
                      {formatAmount(linesSubtotalWon)}
                    </span>
                  </div>
                ) : null}
                {(discountTotalWon ?? 0) > 0 ? (
                  <div className="flex justify-between text-red-700">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {discountSummary ?? (isKo ? "할인" : "Discount")}
                    </span>
                    <span className="font-bold tabular-nums">
                      −{formatAmount(discountTotalWon!)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t("pdfSupply")}
                  </span>
                  <span className="font-bold tabular-nums text-violet-700">
                    {formatAmount(subtotalWon)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t("pdfVat")}
                  </span>
                  <span className="font-bold tabular-nums text-violet-700">
                    {formatAmount(vatWon)}
                  </span>
                </div>
                <div
                  className="flex justify-between rounded-lg px-3 py-2.5 text-base font-black text-white"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
                  }}
                >
                  <span>{isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)"}</span>
                  <span className="tabular-nums">
                    {formatAmount(grandTotalWon)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div
                  className={cn(
                    "rounded-xl border border-gray-200 bg-gray-50 p-3.5",
                    isDefaultDoc && "shadow-sm",
                  )}
                >
                  <p
                    className={cn(
                      "font-semibold uppercase tracking-[0.12em] text-gray-400",
                      isDefaultDoc ? "text-[10px]" : "text-[11px] font-medium text-gray-500",
                    )}
                  >
                    {t("pdfSupply")}
                  </p>
                  <p
                    className={cn(
                      "quote-pdf-amount mt-1.5 font-bold tabular-nums text-violet-700",
                      isDefaultDoc ? "text-xl" : "text-lg",
                    )}
                  >
                    {formatAmount(subtotalWon)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl border border-gray-200 bg-gray-50 p-3.5",
                    isDefaultDoc && "shadow-sm",
                  )}
                >
                  <p
                    className={cn(
                      "font-semibold uppercase tracking-[0.12em] text-gray-400",
                      isDefaultDoc ? "text-[10px]" : "text-[11px] font-medium text-gray-500",
                    )}
                  >
                    {t("pdfVat")}
                  </p>
                  <p
                    className={cn(
                      "quote-pdf-amount mt-1.5 font-bold tabular-nums text-violet-700",
                      isDefaultDoc ? "text-xl" : "text-lg",
                    )}
                  >
                    {formatAmount(vatWon)}
                  </p>
                </div>
                <div
                  className="col-span-2 rounded-xl border border-violet-200 p-4 sm:col-span-1"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100">
                    {isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)"}
                  </p>
                  <p
                    className={cn(
                      "quote-pdf-amount mt-1.5 font-black tabular-nums text-white",
                      isDefaultDoc ? "text-2xl" : "text-xl font-bold",
                    )}
                  >
                    {formatAmount(grandTotalWon)}
                  </p>
                </div>
              </div>
            )}
          </section>

          <footer
            className={cn(
              "border-t pt-3",
              isDefaultDoc
                ? "mt-3 border-gray-200 text-[11px] text-gray-500"
                : "mt-7 border-gray-100 pt-6 text-[10px] text-gray-500",
            )}
          >
            {!isDefaultDoc ? <p>{validityText}</p> : null}
            {!isDefaultDoc && quoteNo ? (
              <p className="mt-1">
                {isKo ? "견적번호" : "Quote No."} {quoteNo}
              </p>
            ) : null}
            {isDefaultDoc ? (
              <p className="text-xs leading-relaxed text-gray-500">{t("pdfFooterNote")}</p>
            ) : null}
            <div className={cn("grid gap-4 sm:grid-cols-2", isDefaultDoc ? "mt-3" : "mt-6")}>
              <div>
                <p
                  className={cn(
                    "font-bold text-violet-700",
                    isDefaultDoc ? "text-xs uppercase tracking-[0.1em]" : "text-xs font-semibold",
                  )}
                >
                  {t("pdfSignature")}
                </p>
                <div className={cn("border-b border-gray-300", isDefaultDoc ? "mt-6" : "mt-8")} />
              </div>
              <div className="relative min-h-[64px] pr-16">
                <p
                  className={cn(
                    "font-bold text-violet-700",
                    isDefaultDoc ? "text-xs uppercase tracking-[0.1em]" : "text-xs font-semibold",
                  )}
                >
                  {t("pdfFooterCompany")}
                </p>
                <p className={cn("mt-2 text-gray-900", isDefaultDoc && "text-sm font-medium")}>
                  {t("pdfFooterTel")}
                </p>
                <p className={cn("text-gray-900", isDefaultDoc && "text-sm")}>{CONTACT_EMAIL}</p>
                {!isDefaultDoc ? (
                  <p className="mt-2 text-gray-500">{t("pdfFooterNote")}</p>
                ) : null}
                <QuoteStampImage
                  className="pointer-events-none absolute bottom-0 right-0 h-[72px] w-[72px] object-contain opacity-[0.85]"
                  style={{ transform: "rotate(-3deg)" }}
                />
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);
