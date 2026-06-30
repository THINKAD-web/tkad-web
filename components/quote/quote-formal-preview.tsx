"use client";

import { forwardRef } from "react";
import type { AdminFormalQuotePdfParams } from "@/lib/build-admin-formal-quote-pdf";
import {
  FORMAL_QUOTE_COLORS,
  formatFormalWon,
  getFormalQuoteIssuer,
} from "@/lib/formal-quote-issuer";
import { QuoteStampImage } from "@/components/quote/quote-stamp-image";
import { cn } from "@/lib/utils";

type Props = AdminFormalQuotePdfParams;

export const QuoteFormalPreview = forwardRef<HTMLDivElement, Props>(
  function QuoteFormalPreview(p, ref) {
    const issuer = getFormalQuoteIssuer();
    const isKo = p.isKo;
    const c = FORMAL_QUOTE_COLORS;

    const vatNote = p.vatIncluded
      ? isKo
        ? "※ 금액 표기: 부가세 포함 기준"
        : "※ Amounts: VAT-inclusive basis"
      : isKo
        ? "※ 금액 표기: 공급가액 기준 (부가세 별도)"
        : "※ Amounts: supply value (VAT extra)";

    const tableHeads = isKo
      ? ["매체명", "규격", "기간", "월 단가(원)", "수량", "금액(원)"]
      : ["Media", "Specs", "Period", "Unit/mo", "Qty", "Amount"];

    const sumRows: Array<{ label: string; value: string; accent?: boolean }> = [
      {
        label: isKo ? "소계" : "Subtotal",
        value: formatFormalWon(p.linesSubtotalWon, isKo),
      },
    ];
    if (p.discountTotalWon > 0) {
      sumRows.push({
        label: p.discountSummary ?? (isKo ? "할인" : "Discount"),
        value: `− ${formatFormalWon(p.discountTotalWon, isKo)}`,
      });
    }
    sumRows.push(
      {
        label: isKo ? "공급가액" : "Supply",
        value: formatFormalWon(p.supplyWon, isKo),
      },
      {
        label: isKo ? "부가세 (10%)" : "VAT (10%)",
        value: formatFormalWon(p.vatWon, isKo),
      },
      {
        label: isKo ? "합계" : "Total",
        value: formatFormalWon(p.totalWon, isKo),
        accent: true,
      },
    );

    const foot = isKo
      ? "본 견적은 발행일부터 유효기간 내에 한하며, 실제 계약 시 재고·조건에 따라 변경될 수 있습니다."
      : "This quote is valid until the date shown and may change subject to availability and final contract terms.";

    return (
      <div
        ref={ref}
        id="quote-formal-preview"
        data-quote-formal-preview
        data-quote-pdf-background="#ffffff"
        className={cn(
          "quote-formal-preview-doc box-border w-full min-w-0 max-w-[794px] overflow-hidden rounded-sm border bg-white text-[#121a3a] antialiased shadow-sm",
          "md:w-[210mm] md:max-w-[210mm]",
        )}
        style={{
          fontFamily:
            "var(--font-pretendard), Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Navy header + gold rule */}
        <div className="relative" style={{ background: c.navy }}>
          <div className="flex items-start justify-between gap-4 px-5 py-3.5">
            <div>
              <p
                className="text-[15px] font-bold tracking-tight"
                style={{ color: c.gold }}
              >
                THINKAD
              </p>
              <p className="mt-0.5 text-[8.5px]" style={{ color: c.gold }}>
                {isKo ? issuer.taglineKo : issuer.taglineEn}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold" style={{ color: c.gold }}>
                {isKo ? "견 적 서" : "QUOTATION"}
              </p>
              <p className="text-[7.5px]" style={{ color: c.gold }}>
                {isKo ? "Quotation" : "견적서"}
              </p>
            </div>
          </div>
          <div className="h-[2px] w-full" style={{ background: c.goldDark }} />
        </div>

        <div className="space-y-4 px-5 py-4 text-[8px] leading-relaxed" style={{ color: c.navyDark }}>
          {/* Issuer */}
          <div className="space-y-0.5 text-[8px]">
            <p>
              {isKo ? issuer.companyKo : issuer.companyEn} · THINKAD
            </p>
            <p>{issuer.address}</p>
            <p>{issuer.regNo}</p>
            <p>
              {isKo ? "대표전화" : "Tel"}. {issuer.tel} | E-mail {issuer.email}
            </p>
          </div>

          {/* Quote info + Bill to */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-md border p-3"
              style={{ borderColor: c.goldDark }}
            >
              <p className="text-[8px] font-bold" style={{ color: c.navy }}>
                {isKo ? "견적 정보" : "Quote info"}
              </p>
              <dl className="mt-2 space-y-1.5 text-[7.5px]">
                {[
                  [isKo ? "견적번호" : "Quote No.", p.quoteNumber],
                  [isKo ? "발행일" : "Issue date", p.issueDate],
                  [isKo ? "유효기간" : "Valid until", p.validUntil],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt style={{ color: c.muted }} className="shrink-0">
                      {k}:
                    </dt>
                    <dd className="font-medium" style={{ color: c.navyDark }}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div
              className="rounded-md border p-3"
              style={{ borderColor: c.goldDark }}
            >
              <p className="text-[8px] font-bold" style={{ color: c.navy }}>
                {isKo ? "수신 (고객사)" : "Bill to"}
              </p>
              <dl className="mt-2 space-y-1 text-[7.5px]">
                <div>
                  <span style={{ color: c.muted }}>
                    {isKo ? "회사" : "Company"}:{" "}
                  </span>
                  <span>{p.clientCompany || "—"}</span>
                </div>
                <div>
                  <span style={{ color: c.muted }}>
                    {isKo ? "담당자" : "Contact"}:{" "}
                  </span>
                  <span>{p.clientName || "—"}</span>
                </div>
                <div>
                  <span style={{ color: c.muted }}>
                    {isKo ? "연락처" : "Phone"}:{" "}
                  </span>
                  <span>{p.clientPhone || "—"}</span>
                </div>
                {p.clientEmail?.trim() ? (
                  <div>
                    <span style={{ color: c.muted }}>E-mail: </span>
                    <span>{p.clientEmail.trim()}</span>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          {/* Campaign period */}
          <div>
            <p className="text-[9px] font-bold" style={{ color: c.navy }}>
              {isKo ? "집행 기간" : "Campaign period"}: {p.periodLabel}
            </p>
            <p className="mt-1 text-[7px]" style={{ color: c.muted }}>
              {vatNote}
            </p>
          </div>

          {/* 6-column table */}
          <div className="overflow-hidden rounded-sm border" style={{ borderColor: c.border }}>
            <table className="w-full border-collapse text-left text-[7px]">
              <thead>
                <tr style={{ background: c.navy, color: c.gold }}>
                  {tableHeads.map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-1.5 py-2 font-bold",
                        i >= 3 && "text-right",
                        i === 4 && "text-center",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.rows.map((row, idx) => (
                  <tr
                    key={`${row.name}-${idx}`}
                    className="border-t"
                    style={{ borderColor: c.border, color: c.navyDark }}
                  >
                    <td className="px-1.5 py-2 align-top font-medium">{row.name}</td>
                    <td className="px-1.5 py-2 align-top">{row.spec || "—"}</td>
                    <td className="px-1.5 py-2 align-top">{row.period}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatFormalWon(row.unitPriceWon, isKo)}
                    </td>
                    <td className="px-1.5 py-2 text-center tabular-nums">
                      {row.quantity}
                    </td>
                    <td className="px-1.5 py-2 text-right font-semibold tabular-nums">
                      {formatFormalWon(row.lineTotalWon, isKo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals — right aligned */}
          <div className="flex justify-end">
            <div className="w-[58%] min-w-[200px] space-y-1.5 text-[8px]">
              {sumRows.map((row) =>
                row.accent ? (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-md px-2.5 py-2.5 font-bold"
                    style={{ background: c.goldTint, color: c.navy }}
                  >
                    <span className="text-[10px]">{row.label}</span>
                    <span className="text-[10px] tabular-nums">{row.value}</span>
                  </div>
                ) : (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span style={{ color: c.muted }}>{row.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: c.navyDark }}>
                      {row.value}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="h-px w-full" style={{ background: c.goldDark }} />

          {/* Bank + contact + stamp */}
          <div className="relative pr-24">
            <p className="text-[8px] font-bold" style={{ color: c.navy }}>
              {isKo ? "입금 계좌" : "Bank transfer"}
            </p>
            <p className="mt-1 text-[7.5px]">
              {issuer.bank} {issuer.account}
            </p>
            <p className="text-[7.5px]">
              {isKo ? "예금주" : "Account holder"}: {issuer.holder}
            </p>

            <p className="mt-3 text-[8px] font-bold" style={{ color: c.navy }}>
              {isKo ? "담당자 연락처" : "Sales contact"}
            </p>
            <p className="mt-1 text-[7.5px]">
              {issuer.salesTitle} · {issuer.tel}
            </p>
            <p className="text-[7.5px]">{issuer.email}</p>

            <QuoteStampImage
              className="pointer-events-none absolute bottom-0 right-0 h-[72px] w-[72px] object-contain opacity-[0.85]"
              style={{ transform: "rotate(-3deg)" }}
            />
          </div>

          <p className="text-[6.5px] leading-relaxed" style={{ color: c.muted }}>
            {foot}
          </p>
        </div>
      </div>
    );
  },
);
