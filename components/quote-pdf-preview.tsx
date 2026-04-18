"use client";

import { forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { cn } from "@/lib/utils";

export type QuotePdfPreviewRow = {
  id: string;
  thumbUrl: string | null;
  name: string;
  location: string;
  unitPriceMan: number;
  lineTotalMan: number;
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
  periodMonths: number;
  rows: QuotePdfPreviewRow[];
  subtotalMan: number;
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

    const accentColor = isPremium ? "#b8924a" : "#0d1b2e";
    const accentLight = isPremium ? "#fdf8ef" : "#f0f3f7";

    return (
      <div
        ref={ref}
        className="relative box-border bg-white text-slate-900 antialiased"
        style={{
          width: "210mm",
          maxWidth: "210mm",
          minHeight: "297mm",
          fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: isPremium ? "linear-gradient(90deg,#b8924a,#e8d5b5,#b8924a)" : accentColor }}
        />

        <div className="px-10 py-8 text-[11px] leading-snug">
          {/* Header */}
          <header className="flex items-start justify-between gap-6 pb-6">
            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ color: accentColor }}
              >
                {t("pdfIssuerLine")}
              </p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-slate-900">
                {t("pdfDocHeading")}
              </h1>
              <p className="mt-1.5 text-[10px] text-slate-400">
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
                  className="flex h-11 w-24 items-center justify-center rounded-lg text-[11px] font-extrabold tracking-wide"
                  style={{
                    background: accentLight,
                    color: accentColor,
                    border: `1px solid ${isPremium ? "#e8d5b5" : "#c0cad4"}`,
                  }}
                >
                  THINKAD
                </div>
              )}
            </div>
          </header>

          {/* Divider */}
          <div className="mb-6 h-px" style={{ background: isPremium ? "#e8d5b5" : "#e2e8f0" }} />

          {/* Client + Campaign info */}
          <section className="mb-7 grid gap-5 sm:grid-cols-2">
            <InfoBlock title={t("pdfClientSection")}>
              <InfoRow label={t("company")} value={company.trim() || "—"} bold />
              <InfoRow label={t("name")} value={contactName.trim() || "—"} bold />
              <InfoRow label={t("phone")} value={contactPhone.trim() || "—"} />
              {contactEmail.trim() && (
                <InfoRow label={t("email")} value={contactEmail.trim()} />
              )}
            </InfoBlock>
            <InfoBlock title={t("pdfCampaignSection")}>
              <InfoRow
                label={t("period")}
                value={`${periodLabel} · ${t("pdfMonthsUnit", { n: periodMonths })}`}
                bold
              />
              <p className="mt-2 text-[10px] text-slate-400">{t("pdfAmountUnitNote")}</p>
            </InfoBlock>
          </section>

          {/* Media table */}
          <section className="mb-7">
            <p
              className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: accentColor }}
            >
              {t("pdfMediaSection")}
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr
                    className="text-[9px] font-semibold uppercase tracking-wider text-white"
                    style={{ background: accentColor }}
                  >
                    <th className="w-14 px-2 py-2.5">{t("pdfColThumb")}</th>
                    <th className="px-2 py-2.5">{t("pdfColName")}</th>
                    <th className="px-2 py-2.5">{t("pdfColLocation")}</th>
                    <th className="w-24 px-2 py-2.5">{t("pdfColPeriod")}</th>
                    <th className="w-20 px-2 py-2.5 text-right">{t("pdfColUnit")}</th>
                    <th className="w-24 px-2 py-2.5 text-right">{t("pdfColAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 align-top"
                      style={{ background: idx % 2 === 0 ? "white" : accentLight }}
                    >
                      <td className="px-2 py-2">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          {row.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbUrl}
                              alt=""
                              crossOrigin="anonymous"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-300">
                              —
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400">
                          {row.size && <span>크기: {row.size}</span>}
                          {row.dailyFootTraffic != null && (
                            <span>유동: {row.dailyFootTraffic.toLocaleString()}명/일</span>
                          )}
                          {row.operatingHours && <span>운영: {row.operatingHours}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-slate-500">{row.location}</td>
                      <td className="px-2 py-2 text-slate-500">{periodLabel}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {formatManWon(row.unitPriceMan, locale)}
                      </td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-slate-900">
                        {formatManWon(row.lineTotalMan, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section className="mb-8 flex justify-end">
            <div className="w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between gap-4 bg-slate-50 px-4 py-2.5">
                <span className="text-[10px] text-slate-500">{t("pdfSupply")}</span>
                <span className="tabular-nums text-[10px] font-semibold text-slate-700">
                  {formatManWon(subtotalMan, locale)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-[10px] text-slate-500">{t("pdfVat")}</span>
                <span className="tabular-nums text-[10px] text-slate-600">
                  {formatManWon(vatMan, locale)}
                </span>
              </div>
              <div
                className="flex justify-between gap-4 px-4 py-3"
                style={{ background: accentColor }}
              >
                <span className="text-[11px] font-bold text-white">{t("pdfTotal")}</span>
                <span
                  className="text-[15px] font-extrabold tabular-nums"
                  style={{ color: isPremium ? "#fdf8ef" : "#c8913c" }}
                >
                  {formatManWon(grandTotalMan, locale)}
                </span>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer
            className="pt-5 text-[9px] text-slate-500"
            style={{ borderTop: `1px solid ${isPremium ? "#e8d5b5" : "#e2e8f0"}` }}
          >
            <p>{t("pdfValidity")}</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-700">{t("pdfSignature")}</p>
                <div className="mt-8 border-b border-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">{t("pdfFooterCompany")}</p>
                <p className="mt-1">{t("pdfFooterTel")}</p>
                <p className="mt-0.5">{t("pdfFooterEmail")}</p>
                <p className="mt-2 text-slate-400">{t("pdfFooterNote")}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-slate-400">{label}</span>
      <span className={cn("min-w-0 break-all", bold ? "font-semibold text-slate-900" : "text-slate-600")}>
        {value}
      </span>
    </div>
  );
}
