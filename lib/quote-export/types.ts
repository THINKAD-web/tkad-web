/**
 * 견적서 서버 출력(PDF·PPTX) 공용 페이로드.
 * 보고서(`lib/planner-report-export`)와 동일하게 서버에서 직접 문서를 그린다.
 * (puppeteer/headless chromium 미사용 — jsPDF + pptxgenjs)
 */

export type QuoteExportTemplate = "basic" | "premium";
export type QuoteExportFormat = "pdf" | "pptx";

export type QuoteExportLine = {
  name: string;
  location: string;
  unitPriceWon: number;
  lineSupplyWon: number;
  impressions?: number;
};

export type QuoteExportPayload = {
  template: QuoteExportTemplate;
  isKo: boolean;
  quoteNo: string;
  issuedAt: string;
  validUntil: string;
  clientCompany: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  periodLabel: string;
  lines: QuoteExportLine[];
  supplyWon: number;
  vatWon: number;
  totalWon: number;
  /** 프리미엄 표지/대시보드용 통계 */
  totalImpressions: number;
  blendedCpmWon: number | null;
  issuer: {
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  /** 직인 이미지 URL (없으면 폴백 직인 도형) */
  stampUrl?: string;
};

export function isQuoteExportPayload(v: unknown): v is QuoteExportPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    (p.template === "basic" || p.template === "premium") &&
    typeof p.quoteNo === "string" &&
    Array.isArray(p.lines)
  );
}

/** 파일명: THINKAD_견적서_{회사}_{YYYY-MM-DD} */
export function quoteExportFileBase(p: QuoteExportPayload): string {
  const date = new Date().toISOString().slice(0, 10);
  const co = (p.clientCompany || p.clientName || (p.isKo ? "고객사" : "client"))
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const word = p.isKo ? "견적서" : "quote";
  return `THINKAD_${word}_${co}_${date}`;
}
