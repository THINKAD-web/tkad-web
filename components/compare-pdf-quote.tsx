"use client";

import { forwardRef } from "react";
import {
  catalogPriceFieldToWon,
  formatMediaPriceWon,
  formatMediaPriceWonWithSymbol,
} from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import { CompareSpecTable } from "@/components/compare-spec-table";

/**
 * 매체 비교 견적 PDF 캡처 영역.
 *
 * - 화면에서는 보이지 않는 위치(off-screen, position:absolute left:-99999px)에
 *   고정된 너비(794px ≈ A4 portrait @ 96 DPI)로 렌더링됩니다.
 * - html2canvas + jsPDF (`downloadPdfFromHtmlElement`) 가 이 ref 를 캡처해서
 *   `THINKAD_견적비교_YYYYMMDD.pdf` 로 저장합니다.
 * - 색은 화면 톤(네온 다크)과 무관하게 PDF 가독성을 위해 인쇄 친화 라이트로 고정.
 */
export type CompareQuotePdfProps = {
  items: MediaItem[];
  isKo: boolean;
  /** 발행일 (YYYY.MM.DD). 부모에서 한 번 stamp 해서 안정 입력. */
  issuedAt: string;
  /** 견적서 식별자(파일명과 유사한 stamp). 헤더 우측에 표시. */
  quoteRef: string;
};

export const CompareQuotePdf = forwardRef<HTMLDivElement, CompareQuotePdfProps>(
  function CompareQuotePdfImpl({ items, isKo, issuedAt, quoteRef }, ref) {
    const locale = isKo ? "ko-KR" : "en-US";
    // 단가 합계 — 카탈로그 field 값을 원(₩) 단위로 합산
    const totalWon = items.reduce(
      (sum, m) => sum + catalogPriceFieldToWon(m.price ?? 0),
      0,
    );
    const vatWon = Math.round(totalWon * 0.1);
    const grandWon = totalWon + vatWon;

    // 캡처 안에서만 쓰는 mini 매체 행 — 가격·기간 한 줄로 정리
    const rows = items.map((m, idx) => {
      const won = catalogPriceFieldToWon(m.price ?? 0);
      const name = isKo ? m.name : m.nameEn || m.name;
      const location =
        (isKo ? m.location : m.locationEn || m.location) || m.location;
      const period = isKo
        ? m.pricePeriod === "month"
          ? "월"
          : m.pricePeriod === "week"
            ? "주"
            : m.pricePeriod === "biweekly"
              ? "격주"
              : m.pricePeriod === "day"
                ? "일"
                : ""
        : m.pricePeriod ?? "";
      return {
        idx: idx + 1,
        id: m.id,
        name,
        location,
        type: m.type,
        period,
        unitDisplay: formatMediaPriceWon(won, locale),
        won,
      };
    });

    return (
      <div
        ref={ref}
        aria-hidden
        style={{
          position: "absolute",
          left: "-99999px",
          top: 0,
          width: 794,
          backgroundColor: "#ffffff",
          color: "#0a0a0c",
          // PDF 캡처는 항상 라이트 모드 컨텍스트
          colorScheme: "light",
        }}
      >
        <div
          style={{
            padding: "36px 40px 32px",
            fontFamily:
              "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              borderBottom: "2px solid #0a0a0c",
              paddingBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                THINKAD
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#5a5a5e",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  싱커드
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#5a5a5e",
                }}
              >
                {isKo ? "OOH MEDIA COMPARISON QUOTE" : "OOH Media Comparison Quote"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#5a5a5e",
                }}
              >
                {isKo ? "발행일" : "Issued"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {issuedAt}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 10,
                  color: "#5a5a5e",
                }}
              >
                {quoteRef}
              </div>
            </div>
          </div>

          {/* Title + lead */}
          <h1
            style={{
              marginTop: 24,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {isKo ? "매체 견적 비교" : "Media Comparison Quote"}
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#3f3f46",
            }}
          >
            {isKo
              ? `선택하신 ${items.length}개 매체의 스펙·단가 비교 자료입니다. 단가는 매체별 권장가 기준이며, 정식 견적은 기간·옵션·할인에 따라 달라질 수 있습니다.`
              : `Comparison of ${items.length} selected media. Listed unit prices are recommended; the final quote depends on period, options, and discounts.`}
          </p>

          {/* Spec table — 화면용 톤 그대로지만 캡처 컨테이너가 white 라 라이트로 인쇄됨 */}
          <div style={{ marginTop: 16 }}>
            <CompareSpecTable items={items} isKo={isKo} />
          </div>

          {/* Cost summary — 단가 합계 */}
          <section
            style={{
              marginTop: 24,
              border: "2px solid #0a0a0c",
              padding: 18,
            }}
          >
            <div
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#3730a3",
              }}
            >
              [ {isKo ? "총 예상 비용 (VAT 별도)" : "Estimated Total (excl. VAT)"} ]
            </div>

            {/* 행별 line items */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 12,
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #d4d4d8",
                    color: "#52525b",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ textAlign: "left", padding: "6px 4px" }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 4px" }}>
                    {isKo ? "매체" : "Media"}
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 4px" }}>
                    {isKo ? "유형" : "Type"}
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 4px" }}>
                    {isKo ? "기간" : "Period"}
                  </th>
                  <th style={{ textAlign: "right", padding: "6px 4px" }}>
                    {isKo ? "단가" : "Unit"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: "1px solid #e4e4e7",
                    }}
                  >
                    <td style={{ padding: "6px 4px", color: "#52525b" }}>
                      {r.idx}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={{ color: "#71717a", fontSize: 11 }}>
                        {r.location}
                      </div>
                    </td>
                    <td style={{ padding: "6px 4px", color: "#52525b" }}>
                      {r.type}
                    </td>
                    <td style={{ padding: "6px 4px", color: "#52525b" }}>
                      {r.period}
                    </td>
                    <td
                      style={{
                        padding: "6px 4px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {r.unitDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #0a0a0c",
                    fontWeight: 700,
                  }}
                >
                  <td
                    colSpan={4}
                    style={{
                      padding: "10px 4px",
                      color: "#52525b",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isKo ? "단가 합계" : "Subtotal"}
                  </td>
                  <td
                    style={{
                      padding: "10px 4px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMediaPriceWonWithSymbol(totalWon, locale)}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "4px 4px",
                      color: "#52525b",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isKo ? "VAT (10%)" : "VAT (10%)"}
                  </td>
                  <td
                    style={{
                      padding: "4px 4px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMediaPriceWonWithSymbol(vatWon, locale)}
                  </td>
                </tr>
                <tr style={{ borderTop: "1px solid #0a0a0c" }}>
                  <td
                    colSpan={4}
                    style={{
                      padding: "10px 4px",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {isKo ? "총 예상 비용" : "Grand Total"}
                  </td>
                  <td
                    style={{
                      padding: "10px 4px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 900,
                      fontSize: 16,
                      color: "#3730a3",
                    }}
                  >
                    {formatMediaPriceWonWithSymbol(grandWon, locale)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "#71717a",
                lineHeight: 1.5,
              }}
            >
              {isKo
                ? "※ 단가는 매체별 권장 단가 기준이며, 실제 견적은 매체사 협의·기간·할인에 따라 달라질 수 있습니다. 본 자료는 정식 견적서가 아니라 비교용 참고 자료입니다."
                : "※ Prices are media-recommended; final quotes depend on negotiations, period, and discounts. This document is a comparison reference, not a formal quote."}
            </p>
          </section>

          {/* Footer */}
          <div
            style={{
              marginTop: 24,
              borderTop: "1px solid #e4e4e7",
              paddingTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#71717a",
            }}
          >
            <span>THINKAD · OOH MARKETPLACE</span>
            <span>
              {isKo
                ? "정식 견적 → /quote"
                : "Formal quote → /quote"}
            </span>
          </div>
        </div>
      </div>
    );
  },
);
