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

    return (
      <div
        ref={ref}
        className={cn(
          "relative box-border border-2 border-bx-black bg-bx-white text-bx-black antialiased",
          "w-[210mm] max-w-[210mm] min-h-[297mm] px-10 py-9 text-[11px] leading-snug",
        )}
        style={{ fontFamily: "system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}
      >
        {isPremium ? (
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-3 bg-bx-accent" />
        ) : null}

        <header
          className={cn(
            "flex items-start justify-between gap-4 border-b-2 border-bx-black pb-5",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {t("pdfIssuerLine")} ]
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-bx-black">
              {t("pdfDocHeading")}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
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
                    ? "border-bx-accent bg-bx-accent text-bx-white"
                    : "border-bx-black bg-bx-white text-bx-black",
                )}
              >
                THINKAD
              </div>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-0 sm:grid-cols-2">
          <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black p-4">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {t("pdfClientSection")} ]
            </h2>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-bx-gray-dim">{t("company")}</dt>
                <dd className="min-w-0 font-bold text-bx-black">
                  {company.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-bx-gray-dim">{t("name")}</dt>
                <dd className="min-w-0 font-bold text-bx-black">
                  {contactName.trim() || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-bx-gray-dim">{t("phone")}</dt>
                <dd className="min-w-0 font-mono">{contactPhone.trim() || "—"}</dd>
              </div>
              {contactEmail.trim() ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-mono text-bx-gray-dim">{t("email")}</dt>
                  <dd className="min-w-0 break-all font-mono">{contactEmail.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black p-4">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {t("pdfCampaignSection")} ]
            </h2>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 font-mono text-bx-gray-dim">{t("period")}</dt>
                <dd className="font-bold text-bx-black">
                  {periodLabel} · {t("pdfMonthsUnit", { n: periodMonths })}
                </dd>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                {`// `}{t("pdfAmountUnitNote")}
              </p>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {t("pdfMediaSection")} ]
          </h2>
          <div className="overflow-hidden border-2 border-bx-black">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-bx-black font-mono text-[9px] uppercase tracking-[0.18em] text-bx-accent">
                  <th className="w-14 border-b-2 border-bx-black px-1.5 py-2 font-bold">
                    {t("pdfColThumb")}
                  </th>
                  <th className="border-b-2 border-bx-black px-1.5 py-2 font-bold">
                    {t("pdfColName")}
                  </th>
                  <th className="border-b-2 border-bx-black px-1.5 py-2 font-bold">
                    {t("pdfColLocation")}
                  </th>
                  <th className="w-24 border-b-2 border-bx-black px-1.5 py-2 font-bold">
                    {t("pdfColPeriod")}
                  </th>
                  <th className="w-20 border-b-2 border-bx-black px-1.5 py-2 text-right font-bold">
                    {t("pdfColUnit")}
                  </th>
                  <th className="w-24 border-b-2 border-bx-black px-1.5 py-2 text-right font-bold">
                    {t("pdfColAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-bx-black align-top",
                      idx % 2 === 0 ? "bg-bx-white" : "bg-bx-off",
                    )}
                  >
                    <td className="px-1.5 py-2">
                      <div className="h-12 w-12 overflow-hidden border-2 border-bx-black bg-bx-off">
                        {row.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.thumbUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-[8px] text-bx-gray-dim">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 font-bold text-bx-black">
                      <p className="font-bold">{row.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                        {row.size && <span>사이즈: {row.size}</span>}
                        {row.dailyFootTraffic != null && (
                          <span>일 유동: {row.dailyFootTraffic.toLocaleString()}명</span>
                        )}
                        {row.operatingHours && <span>운영: {row.operatingHours}</span>}
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-bx-black">{row.location}</td>
                    <td className="px-1.5 py-2 font-mono text-bx-black">{periodLabel}</td>
                    <td className="px-1.5 py-2 text-right font-mono tabular-nums">
                      {formatManWon(row.unitPriceMan, locale)}
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold tabular-nums text-bx-black">
                      {formatManWon(row.lineTotalMan, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-[280px] space-y-0 text-[11px]">
            <div className="flex justify-between gap-4 border-2 border-bx-black bg-bx-white px-3 py-2">
              <span className="font-mono text-bx-gray-dim">{t("pdfSupply")}</span>
              <span className="font-mono tabular-nums font-bold text-bx-black">
                {formatManWon(subtotalMan, locale)}
              </span>
            </div>
            <div className="-mt-[2px] flex justify-between gap-4 border-2 border-bx-black bg-bx-white px-3 py-2">
              <span className="font-mono text-bx-gray-dim">{t("pdfVat")}</span>
              <span className="font-mono tabular-nums text-bx-black">
                {formatManWon(vatMan, locale)}
              </span>
            </div>
            <div className="-mt-[2px] flex justify-between gap-4 border-2 border-bx-accent bg-bx-black px-3 py-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("pdfTotal")} ]
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-bx-accent">
                {formatManWon(grandTotalMan, locale)}
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t-2 border-bx-black pt-6 text-[9px] text-bx-gray-dim">
          <p className="font-mono">{`// `}{t("pdfValidity")}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("pdfSignature")} ]
              </p>
              <div className="mt-8 border-b-2 border-bx-black" />
            </div>
            <div className="text-right sm:text-left">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("pdfFooterCompany")} ]
              </p>
              <p className="mt-2 font-mono text-bx-black">{t("pdfFooterTel")}</p>
              <p className="mt-0.5 font-mono text-bx-black">{t("pdfFooterEmail")}</p>
              <p className="mt-3 font-mono text-bx-gray-dim">{t("pdfFooterNote")}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  },
);
