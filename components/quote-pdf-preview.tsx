"use client";

import { forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";
import {
  CompositePreview,
  type CompositeLogoPlacement,
} from "@/components/planner/composite-preview";

export type QuotePdfPreviewRow = {
  id: string;
  thumbUrl: string | null;
  name: string;
  location: string;
  unitPriceMan: number;
  lineTotalMan: number;
  /** 추가 스펙 */
  size?: string | null;
  dailyFootTraffic?: number | null;
  visibilityScore?: number | null;
  operatingHours?: string | null;
  /**
   * Planner composite 결과 — `creativeMode === "composite"` 일 때 매체별 합성 로고를
   * thumbnail 위에 오버레이해 PDF 출력에 그대로 노출한다. 없으면 평면 thumbUrl 만 사용.
   */
  compositeLogo?: {
    url: string;
    placement: CompositeLogoPlacement;
  };
};

type Props = {
  template: QuoteTemplateId;
  customerLogoSrc: string | null;
  company: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  periodLabel: string;
  /** 집행 기간 표기에 사용 (예: × 3개월) */
  periodMonths: number;
  rows: QuotePdfPreviewRow[];
  subtotalMan: number;
  /** 할인 금액(만원). 0 이면 할인 라인 미표시. */
  discountMan?: number;
  /** 할인 정책 라벨(예: "30일 이상 장기 할인"). */
  discountLabel?: string;
  vatMan: number;
  grandTotalMan: number;
  issuedAt: Date;
};

function formatManWon(n: number, locale: string): string {
  const num = Math.round(n).toLocaleString(locale);
  if (locale === "ko") return `₩${num}만원`;
  return `₩${num} (10K KRW)`;
}

export const QuotePdfPreview = forwardRef<HTMLDivElement, Props>(
  function QuotePdfPreview(
    {
      template,
      customerLogoSrc,
      company,
      contactName,
      contactPhone,
      contactEmail,
      periodLabel,
      periodMonths,
      rows,
      subtotalMan,
      discountMan,
      discountLabel,
      vatMan,
      grandTotalMan,
      issuedAt,
    },
    ref,
  ) {
    const t = useTranslations("quote");
    const locale = useLocale();
    const isPremium = template === "premium";
    const dateStr = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(issuedAt);

    return (
      <div
        ref={ref}
        className={cn(
          "relative box-border bg-white text-slate-900 antialiased",
          "w-[210mm] max-w-[210mm] min-h-[297mm] px-10 py-9 text-[11px] leading-snug shadow-sm",
          "font-sans",
        )}
        style={{ fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}
      >
        {isPremium ? (
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-2 bg-[#d4af37]" />
        ) : null}

        <header
          className={cn(
            "flex items-start justify-between gap-4 border-b pb-5",
            isPremium ? "border-[#d4af37]/50" : "border-slate-200",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("pdfIssuerLine")}
            </p>
            <h1
              className={cn(
                "mt-2 text-2xl font-bold tracking-tight",
                isPremium ? "text-[#0f172a]" : "text-slate-900",
              )}
            >
              {t("pdfDocHeading")}
            </h1>
            <p className="mt-2 text-[10px] text-slate-500">
              {t("pdfIssueDate")}: {dateStr}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {customerLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customerLogoSrc}
                alt=""
                className="max-h-14 max-w-[140px] object-contain"
              />
            ) : (
              <div
                className={cn(
                  "flex h-12 w-28 items-center justify-center rounded border text-xs font-bold",
                  isPremium
                    ? "border-[#d4af37]/60 bg-[#faf8f3] text-[#0f172a]"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                THINKAD
              </div>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {t("pdfClientSection")}
            </h2>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500">{t("company")}</dt>
                <dd className="min-w-0 font-medium text-slate-900">
                  {company.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500">{t("name")}</dt>
                <dd className="min-w-0 font-medium text-slate-900">
                  {contactName.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500">{t("phone")}</dt>
                <dd className="min-w-0">{contactPhone.trim() || "—"}</dd>
              </div>
              {contactEmail.trim() ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-500">{t("email")}</dt>
                  <dd className="min-w-0 break-all">{contactEmail.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {t("pdfCampaignSection")}
            </h2>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-500">{t("period")}</dt>
                <dd className="font-medium text-slate-900">
                  {periodLabel} · {t("pdfMonthsUnit", { n: periodMonths })}
                </dd>
              </div>
              <p className="text-[10px] text-slate-500">{t("pdfAmountUnitNote")}</p>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {t("pdfMediaSection")}
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr
                  className={cn(
                    "text-[9px] uppercase tracking-wide text-white",
                    isPremium ? "bg-[#b8924a]" : "bg-[#0d1b2e]",
                  )}
                >
                  <th className="w-14 border-b border-slate-200 px-1.5 py-2 font-semibold">
                    {t("pdfColThumb")}
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-2 font-semibold">
                    {t("pdfColName")}
                  </th>
                  <th className="border-b border-slate-200 px-1.5 py-2 font-semibold">
                    {t("pdfColLocation")}
                  </th>
                  <th className="w-24 border-b border-slate-200 px-1.5 py-2 font-semibold">
                    {t("pdfColPeriod")}
                  </th>
                  <th className="w-20 border-b border-slate-200 px-1.5 py-2 text-right font-semibold">
                    {t("pdfColUnit")}
                  </th>
                  <th className="w-24 border-b border-slate-200 px-1.5 py-2 text-right font-semibold">
                    {t("pdfColAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-slate-100 align-top", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <td className="px-1.5 py-2">
                      <div className="h-12 w-12 overflow-hidden rounded border border-slate-100 bg-slate-50">
                        {row.compositeLogo && row.thumbUrl ? (
                          <CompositePreview
                            mediaImageUrl={row.thumbUrl}
                            mediaName={row.name}
                            logoUrl={row.compositeLogo.url}
                            placement={row.compositeLogo.placement}
                            editable={false}
                            compact
                            className="h-full w-full"
                          />
                        ) : row.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.thumbUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 font-medium text-slate-900">
                      <p className="font-semibold">{row.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                        {row.size && <span>사이즈: {row.size}</span>}
                        {row.dailyFootTraffic != null && (
                          <span>일 유동: {row.dailyFootTraffic.toLocaleString()}명</span>
                        )}
                        {row.operatingHours && <span>운영: {row.operatingHours}</span>}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-slate-700">{row.location}</td>
                    <td className="px-1.5 py-2 text-slate-700">{periodLabel}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatManWon(row.unitPriceMan, locale)}
                    </td>
                    <td className="px-1.5 py-2 text-right font-semibold tabular-nums text-slate-900">
                      {formatManWon(row.lineTotalMan, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-[260px] space-y-2 text-[11px]">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
              <span className="text-slate-600">{t("pdfSupply")}</span>
              <span className="tabular-nums font-medium">
                {formatManWon(subtotalMan, locale)}
              </span>
            </div>
            {discountMan != null && discountMan > 0 ? (
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                <span className="min-w-0 truncate text-emerald-700">
                  {discountLabel || t("pdfDiscount")}
                </span>
                <span className="tabular-nums font-medium text-emerald-700">
                  −{formatManWon(discountMan, locale)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
              <span className="text-slate-600">{t("pdfVat")}</span>
              <span className="tabular-nums">{formatManWon(vatMan, locale)}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-md bg-navy px-3 py-2 pt-2">
              <span className="font-bold text-white">{t("pdfTotal")}</span>
              <span className="text-base font-bold tabular-nums text-gold-light">
                {formatManWon(grandTotalMan, locale)}
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-[9px] text-slate-600">
          <p>{t("pdfValidity")}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-800">{t("pdfSignature")}</p>
              <div className="mt-8 border-b border-slate-300" />
            </div>
            <div className="text-right sm:text-left">
              <p className="font-semibold text-slate-800">{t("pdfFooterCompany")}</p>
              <p className="mt-1">{t("pdfFooterTel")}</p>
              <p className="mt-0.5">{t("pdfFooterEmail")}</p>
              <p className="mt-2 text-slate-500">{t("pdfFooterNote")}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  },
);
