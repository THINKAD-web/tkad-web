"use client";

import { forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";

export type QuotePdfPreviewRow = {
  id: string;
  thumbUrl: string | null;
  name: string;
  location: string;
  /** 단가 (원). 만원 단위로 표시될 때만 round 적용. */
  unitPriceWon: number;
  /** 라인 합계 (원). */
  lineTotalWon: number;
  /** 추가 스펙 */
  size?: string | null;
  dailyFootTraffic?: number | null;
  visibilityScore?: number | null;
  operatingHours?: string | null;
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
  /** 기간 단위 라벨 (예: "2주", "주", "일"). 미지정 시 "{n}개월" 사용 */
  periodUnitLabel?: string | null;
  rows: QuotePdfPreviewRow[];
  /** 공급가/부가세/총계 (원). 표시 직전 한 번만 만원 변환 → round 누적 손실 방지. */
  subtotalWon: number;
  vatWon: number;
  grandTotalWon: number;
  issuedAt: Date;
};

/** 원 단위 입력을 받아 "₩{만원}만원" / "₩{10K} (10K KRW)" 표기로 변환. */
function formatManWon(won: number, locale: string): string {
  const man = Math.round(won / 10_000);
  const num = man.toLocaleString(locale);
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
      subtotalWon,
      vatWon,
      grandTotalWon,
      issuedAt,
      periodUnitLabel,
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
          "relative box-border border-2 border-navy bg-white text-navy antialiased",
          "w-[210mm] max-w-[210mm] min-h-[297mm] px-10 py-9 text-[11px] leading-snug",
        )}
        style={{ fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}
      >
        {isPremium ? (
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-3 bg-gold" />
        ) : null}

        <header
          className={cn(
            "flex items-start justify-between gap-4 border-b-2 border-navy pb-5",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
              [ {t("pdfIssuerLine")} ]
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy">
              {t("pdfDocHeading")}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {`// `}{t("pdfIssueDate")}: {dateStr}
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
                  "flex h-12 w-28 items-center justify-center border-2 font-mono text-xs font-bold uppercase tracking-[0.22em]",
                  isPremium
                    ? "border-gold bg-gold dark:text-white text-gray-900"
                    : "border-navy bg-white text-navy",
                )}
              >
                THINKAD
              </div>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-0 sm:grid-cols-2">
          <div className="-mt-[2px] -ml-[2px] border-2 border-navy p-4">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
              [ {t("pdfClientSection")} ]
            </h2>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-slate-500">{t("company")}</dt>
                <dd className="min-w-0 font-bold text-navy">
                  {company.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-slate-500">{t("name")}</dt>
                <dd className="min-w-0 font-bold text-navy">
                  {contactName.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-slate-500">{t("phone")}</dt>
                <dd className="min-w-0 font-mono">{contactPhone.trim() || "—"}</dd>
              </div>
              {contactEmail.trim() ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-mono text-slate-500">{t("email")}</dt>
                  <dd className="min-w-0 break-all font-mono">{contactEmail.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="-mt-[2px] -ml-[2px] border-2 border-navy p-4">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
              [ {t("pdfCampaignSection")} ]
            </h2>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 font-mono text-slate-500">{t("period")}</dt>
                <dd className="font-bold text-navy">
                  {periodLabel} ·{" "}
                  {periodUnitLabel
                    ? `${periodMonths}${periodUnitLabel}`
                    : t("pdfMonthsUnit", { n: periodMonths })}
                </dd>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {`// `}{t("pdfAmountUnitNote")}
              </p>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
            [ {t("pdfMediaSection")} ]
          </h2>
          <div className="overflow-hidden border-2 border-navy">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-navy font-mono text-[9px] uppercase tracking-[0.18em] text-gold-dark">
                  <th className="w-14 border-b-2 border-navy px-1.5 py-2 font-bold">
                    {t("pdfColThumb")}
                  </th>
                  <th className="border-b-2 border-navy px-1.5 py-2 font-bold">
                    {t("pdfColName")}
                  </th>
                  <th className="border-b-2 border-navy px-1.5 py-2 font-bold">
                    {t("pdfColLocation")}
                  </th>
                  <th className="w-24 border-b-2 border-navy px-1.5 py-2 font-bold">
                    {t("pdfColPeriod")}
                  </th>
                  <th className="w-20 border-b-2 border-navy px-1.5 py-2 text-right font-bold">
                    {t("pdfColUnit")}
                  </th>
                  <th className="w-24 border-b-2 border-navy px-1.5 py-2 text-right font-bold">
                    {t("pdfColAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-navy align-top",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                    )}
                  >
                    <td className="px-1.5 py-2">
                      <div className="h-12 w-12 overflow-hidden border-2 border-navy bg-slate-50">
                        {row.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.thumbUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-[8px] text-slate-500">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 font-bold text-navy">
                      <p className="font-bold">{row.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] tracking-tight text-slate-500">
                        {row.size && <span>사이즈: {row.size}</span>}
                        {row.dailyFootTraffic != null && (
                          <span>일 유동: {row.dailyFootTraffic.toLocaleString()}명</span>
                        )}
                        {row.operatingHours && <span>운영: {row.operatingHours}</span>}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-navy">{row.location}</td>
                    <td className="px-1.5 py-2 font-mono text-navy">{periodLabel}</td>
                    <td className="px-1.5 py-2 text-right font-mono tabular-nums">
                      {formatManWon(row.unitPriceWon, locale)}
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold tabular-nums text-navy">
                      {formatManWon(row.lineTotalWon, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-[280px] space-y-0 text-[11px]">
            <div className="flex justify-between gap-4 border-2 border-navy bg-white px-3 py-2">
              <span className="font-mono text-slate-500">{t("pdfSupply")}</span>
              <span className="font-mono tabular-nums font-bold text-navy">
                {formatManWon(subtotalWon, locale)}
              </span>
            </div>
            <div className="-mt-[2px] flex justify-between gap-4 border-2 border-navy bg-white px-3 py-2">
              <span className="font-mono text-slate-500">{t("pdfVat")}</span>
              <span className="font-mono tabular-nums text-navy">
                {formatManWon(vatWon, locale)}
              </span>
            </div>
            <div className="-mt-[2px] flex justify-between gap-4 border-2 border-gold bg-navy px-3 py-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
                [ {t("pdfTotal")} ]
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-gold-dark">
                {formatManWon(grandTotalWon, locale)}
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t-2 border-navy pt-6 text-[9px] text-slate-500">
          <p className="font-mono">{`// `}{t("pdfValidity")}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
                [ {t("pdfSignature")} ]
              </p>
              <div className="mt-8 border-b-2 border-navy" />
            </div>
            <div className="text-right sm:text-left">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark">
                [ {t("pdfFooterCompany")} ]
              </p>
              <p className="mt-2 font-mono text-navy">{t("pdfFooterTel")}</p>
              <p className="mt-0.5 font-mono text-navy">{CONTACT_EMAIL}</p>
              <p className="mt-3 font-mono text-slate-500">{t("pdfFooterNote")}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  },
);
