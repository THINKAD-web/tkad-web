"use client";

import { forwardRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";

const STAMP_URL =
  "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/%5B%E1%84%89%E1%85%B5%E1%86%BC%E1%84%8F%E1%85%A5%E1%84%83%E1%85%B3%5D%20%E1%84%83%E1%85%A9%E1%84%8C%E1%85%A1%E1%86%BC.png";

/** html2canvas 캡처용 same-origin 프록시 (CORS·403 방지) */
const STAMP_CAPTURE_SRC = `/api/image-proxy?url=${encodeURIComponent(STAMP_URL)}`;

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

/** 원 단위 입력을 받아 "₩{만원}만원" / "₩{10K} (10K KRW)" 표기로 변환. */
function formatManWon(won: number, locale: string): string {
  const man = Math.round(won / 10_000);
  const num = man.toLocaleString(locale);
  if (locale === "ko") return `₩${num}만원`;
  return `₩${num} (10K KRW)`;
}

/** PDF 섹션 라벨 — html2canvas 호환 (background-clip:text 미사용) */
function NeonSectionTag({ children }: { children: ReactNode }) {
  return (
    <span
      className="font-display text-xs font-medium uppercase tracking-[0.22em]"
      style={{ color: "#5b21b6" }}
    >
      {children}
    </span>
  );
}

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
          "relative box-border overflow-hidden border-2 border-navy bg-white text-navy antialiased",
          "w-[210mm] max-w-[210mm] min-h-[297mm] py-9 pl-11 pr-10 text-[11px] leading-snug",
        )}
        style={{
          fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          width: "210mm",
          maxWidth: "210mm",
        }}
      >
        {/* 네온 사이드 액센트 */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 top-0 w-2"
          style={{
            background: "linear-gradient(to bottom, #7C3AED, #06B6D4)",
          }}
        />

        {isPremium ? (
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-3 bg-gold" />
        ) : (
          <div
            aria-hidden
            className="pointer-events-none absolute left-2 right-0 top-0 h-0.5 opacity-80"
            style={{
              background: "linear-gradient(90deg, #7C3AED, #06B6D4, transparent)",
            }}
          />
        )}

        <header
          className={cn(
            "flex items-start justify-between gap-4 border-b-2 border-navy pb-5",
          )}
        >
          <div className="min-w-0 flex-1">
            <NeonSectionTag>[ {t("pdfIssuerLine")} ]</NeonSectionTag>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy">
              {documentHeading?.trim() || t("pdfDocHeading")}
            </h1>
            <p className="mt-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
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
                  "flex h-12 w-28 items-center justify-center border-2 font-display text-xs font-medium uppercase tracking-[0.22em]",
                  isPremium
                    ? "border-gold bg-gold text-gray-900"
                    : "border-navy bg-white text-navy",
                )}
              >
                THINKAD
              </div>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-0 sm:grid-cols-2">
          <div className="-ml-[2px] -mt-[2px] border-2 border-navy p-4">
            <NeonSectionTag>[ {t("pdfClientSection")} ]</NeonSectionTag>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500">{t("company")}</dt>
                <dd className="min-w-0 font-bold text-navy">
                  {company.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-slate-500">{t("name")}</dt>
                <dd className="min-w-0 font-bold text-navy">
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
          <div className="-ml-[2px] -mt-[2px] border-2 border-navy p-4">
            <NeonSectionTag>[ {t("pdfCampaignSection")} ]</NeonSectionTag>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-500">{t("period")}</dt>
                <dd className="font-bold text-navy">{periodLabel}</dd>
              </div>
              <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {`// `}{t("pdfAmountUnitNote")}
              </p>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3">
            <NeonSectionTag>[ {t("pdfMediaSection")} ]</NeonSectionTag>
          </div>
          <div className="overflow-hidden border-2 border-navy">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-navy font-display text-xs font-medium uppercase tracking-[0.18em]">
                  <th className="w-14 border-b-2 border-navy px-1.5 py-2 font-bold text-cyan-300">
                    {t("pdfColThumb")}
                  </th>
                  <th className="border-b-2 border-navy px-1.5 py-2 font-bold text-cyan-300">
                    {t("pdfColName")}
                  </th>
                  <th className="border-b-2 border-navy px-1.5 py-2 font-bold text-cyan-300">
                    {t("pdfColLocation")}
                  </th>
                  <th className="w-24 border-b-2 border-navy px-1.5 py-2 font-bold text-cyan-300">
                    {t("pdfColPeriod")}
                  </th>
                  <th className="w-20 border-b-2 border-navy px-1.5 py-2 text-right font-bold text-cyan-300">
                    {t("pdfColUnitGeneric")}
                  </th>
                  <th className="w-24 border-b-2 border-navy px-1.5 py-2 text-right font-bold text-cyan-300">
                    {t("pdfColAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-navy align-top"
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td className="px-1.5 py-2">
                      <div
                        className="h-12 w-12 overflow-hidden border-2 border-navy"
                        style={{
                          width: 48,
                          height: 48,
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        {row.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.thumbUrl}
                            alt=""
                            loading="eager"
                            decoding="sync"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            style={{
                              display: "block",
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-500">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 font-bold text-navy">
                      <p className="font-bold">{row.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] tracking-tight text-slate-500">
                        {row.size && <span>사이즈: {row.size}</span>}
                        {row.dailyFootTraffic != null && (
                          <span>일 유동: {row.dailyFootTraffic.toLocaleString()}명</span>
                        )}
                        {row.operatingHours && <span>운영: {row.operatingHours}</span>}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-navy">{row.location}</td>
                    <td className="px-1.5 py-2 text-navy">
                      {row.executionPeriodLabel ?? periodLabel}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      <div>{formatManWon(row.unitPriceWon, locale)}</div>
                      {row.unitPeriodLabel ? (
                        <div className="text-[9px] font-medium text-slate-500">
                          / {row.unitPeriodLabel}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-1.5 py-2 text-right font-bold tabular-nums text-violet-700">
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
              <span className="text-slate-500">{t("pdfSupply")}</span>
              <span className="tabular-nums font-bold text-navy">
                {formatManWon(subtotalWon, locale)}
              </span>
            </div>
            <div className="-mt-[2px] flex justify-between gap-4 border-2 border-navy bg-white px-3 py-2">
              <span className="text-slate-500">{t("pdfVat")}</span>
              <span className="tabular-nums text-navy">
                {formatManWon(vatWon, locale)}
              </span>
            </div>
            <div
              className="-mt-[2px] flex justify-between gap-4 border-2 px-3 py-3 text-white"
              style={{
                borderColor: "#7C3AED",
                background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
              }}
            >
              <span className="font-display text-xs font-medium uppercase tracking-[0.22em]">
                [ {t("pdfTotal")} ]
              </span>
              <span className="text-base font-bold tabular-nums">
                {formatManWon(grandTotalWon, locale)}
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t-2 border-navy pt-6 text-[9px] text-slate-500">
          <p className="font-display">{`// `}{t("pdfValidity")}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <NeonSectionTag>[ {t("pdfSignature")} ]</NeonSectionTag>
              <div className="mt-8 border-b-2 border-navy" />
            </div>
            <div className="relative pr-20 text-right sm:text-left">
              <NeonSectionTag>[ {t("pdfFooterCompany")} ]</NeonSectionTag>
              <p className="mt-2 text-navy">{t("pdfFooterTel")}</p>
              <p className="mt-0.5 text-navy">{CONTACT_EMAIL}</p>
              <p className="mt-3 text-slate-500">{t("pdfFooterNote")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STAMP_CAPTURE_SRC}
                alt=""
                loading="eager"
                decoding="sync"
                className="pointer-events-none absolute bottom-0 right-0 h-[72px] w-[72px] object-contain opacity-[0.85]"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  opacity: 0.85,
                  transform: "rotate(-3deg)",
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </footer>
      </div>
    );
  },
);
