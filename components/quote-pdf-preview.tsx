"use client";

import { forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";
import { formatDocumentManWon } from "@/lib/document-text";
import { MediaDetailCard } from "@/components/document/media-detail-card";
import {
  documentCardClass,
  DocumentGradientHero,
  DocumentSectionHeading,
} from "@/components/document/document-layout";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import { QuoteStampImage } from "@/components/quote/quote-stamp-image";

export type QuotePdfPreviewRow = {
  id: string;
  thumbUrl: string | null;
  name: string;
  location: string;
  /** 단가 (원). 만원 단위로 표시될 때만 round 적용. */
  unitPriceWon: number;
  /** 라인 합계 (원). */
  lineTotalWon: number;
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
    },
    ref,
  ) {
    const t = useTranslations("quote");
    const locale = useLocale();
    const isKo = locale === "ko";
    const isPremium = template === "premium";
    const dateStr = new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(issuedAt);

    const heading = documentHeading?.trim() || t("pdfDocHeading");
    const subtitle = `${periodLabel} · ${isKo ? "발행" : "Issued"} ${dateStr}`;

    return (
      <div
        ref={ref}
        className={cn(
          documentCardClass,
          "quote-pdf-preview-doc box-border w-full min-w-0 antialiased",
          "md:w-[210mm] md:max-w-[210mm] md:min-h-[297mm]",
        )}
        data-quote-pdf-background="#ffffff"
        style={{
          fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        }}
      >
        <DocumentGradientHero
          badge={isPremium ? "PREMIUM QUOTE" : "ADVERTISING QUOTE"}
          title={heading}
          subtitle={subtitle}
          topAccent={isPremium ? "gold" : "none"}
        />

        <div className="space-y-8 px-6 py-8 sm:px-9">
          {customerLogoSrc ? (
            <div className="flex justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customerLogoSrc}
                alt=""
                className="max-h-12 max-w-[140px] object-contain"
              />
            </div>
          ) : null}

          <section className="space-y-4">
            <DocumentSectionHeading>{t("pdfClientSection")}</DocumentSectionHeading>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4 sm:grid-cols-4">
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

          <section className="space-y-4">
            <DocumentSectionHeading>{t("pdfCampaignSection")}</DocumentSectionHeading>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-gray-500">{t("period")}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">{periodLabel}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-gray-500">
                  {isKo ? "금액 단위" : "Amount unit"}
                </dt>
                <dd className="mt-0.5 text-sm text-gray-600">{t("pdfAmountUnitNote")}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4">
            <DocumentSectionHeading>{t("pdfMediaSection")}</DocumentSectionHeading>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center text-sm text-gray-500">
                {isKo ? "선택된 매체가 없습니다." : "No media selected."}
              </p>
            ) : (
              <ul className="space-y-4">
                {rows.map((row) => {
                  const unitLabel = row.unitPeriodLabel
                    ? `${formatDocumentManWon(row.unitPriceWon, isKo)} / ${row.unitPeriodLabel}`
                    : formatDocumentManWon(row.unitPriceWon, isKo);
                  const detail: DocumentMediaDetail = {
                    id: row.id,
                    name: row.name,
                    location: row.location,
                    thumbUrl: row.thumbUrl,
                    categoryLabel: row.categoryLabel ?? undefined,
                    size: row.size ?? undefined,
                    operatingHours: row.operatingHours ?? undefined,
                    dailyTraffic: row.dailyFootTraffic ?? undefined,
                    broadcastLabel: row.broadcastLabel ?? undefined,
                    monthlyPriceLabel: unitLabel,
                    lineTotalLabel: formatDocumentManWon(row.lineTotalWon, isKo),
                  };
                  return (
                    <li key={row.id}>
                      <MediaDetailCard detail={detail} isKo={isKo} compact />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <DocumentSectionHeading>{t("pdfTotal")}</DocumentSectionHeading>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                <p className="text-[11px] font-medium text-gray-500">{t("pdfSupply")}</p>
                <p className="quote-pdf-amount mt-1 text-lg font-bold tabular-nums text-violet-700">
                  {formatDocumentManWon(subtotalWon, isKo)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                <p className="text-[11px] font-medium text-gray-500">{t("pdfVat")}</p>
                <p className="quote-pdf-amount mt-1 text-lg font-bold tabular-nums text-violet-700">
                  {formatDocumentManWon(vatWon, isKo)}
                </p>
              </div>
              <div
                className="col-span-2 rounded-xl border border-violet-200 p-3.5 sm:col-span-1"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
                }}
              >
                <p className="text-[11px] font-medium text-violet-100">
                  {isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)"}
                </p>
                <p className="quote-pdf-amount mt-1 text-xl font-bold tabular-nums text-white">
                  {formatDocumentManWon(grandTotalWon, isKo)}
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-gray-100 pt-6 text-[10px] text-gray-500">
            <p>{t("pdfValidity")}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-violet-700">{t("pdfSignature")}</p>
                <div className="mt-8 border-b border-gray-300" />
              </div>
              <div className="relative min-h-[88px] pr-20">
                <p className="text-xs font-semibold text-violet-700">{t("pdfFooterCompany")}</p>
                <p className="mt-2 text-gray-900">{t("pdfFooterTel")}</p>
                <p className="text-gray-900">{CONTACT_EMAIL}</p>
                <p className="mt-2 text-gray-500">{t("pdfFooterNote")}</p>
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
