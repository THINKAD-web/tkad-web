import { CONTACT_EMAIL } from "@/lib/constants";

/** Strip literal `\n` / real newlines from Vercel env values (single-line fields). */
export function normalizeQuoteEnvText(
  value: string | undefined,
  fallback: string,
): string {
  const raw = value?.trim();
  if (!raw) return fallback;
  return raw
    .replace(/\\r\\n|\\n|\\r/gi, " ")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type FormalQuoteIssuer = ReturnType<typeof getFormalQuoteIssuer>;

/** Formal quote issuer block — PDF·HTML 미리보기 공통 (Hq8에서 실데이터 교체) */
export function getFormalQuoteIssuer() {
  return {
    companyKo: "(주)싱커드",
    companyEn: "THINKAD Inc.",
    taglineKo: "OOH 광고 · 미디어 플래닝",
    taglineEn: "OOH advertising & media planning",
    address: normalizeQuoteEnvText(
      process.env.QUOTE_ISSUER_ADDRESS,
      "서울특별시 (주소는 환경변수 QUOTE_ISSUER_ADDRESS로 설정)",
    ),
    regNo: normalizeQuoteEnvText(
      process.env.QUOTE_ISSUER_REG_NO,
      "사업자등록번호: (등록 후 입력)",
    ),
    tel: normalizeQuoteEnvText(process.env.QUOTE_ISSUER_TEL, "02-515-2772"),
    email: normalizeQuoteEnvText(process.env.QUOTE_ISSUER_EMAIL, CONTACT_EMAIL),
    bank: normalizeQuoteEnvText(process.env.QUOTE_BANK_NAME, "국민은행"),
    account: normalizeQuoteEnvText(
      process.env.QUOTE_BANK_ACCOUNT,
      "000000-00-000000",
    ),
    holder: normalizeQuoteEnvText(process.env.QUOTE_BANK_HOLDER, "(주)싱커드"),
    salesTitle: normalizeQuoteEnvText(
      process.env.QUOTE_SALES_TITLE,
      "견적·제안",
    ),
  };
}

export function formatFormalWon(n: number, isKo: boolean): string {
  return `₩${Math.round(n).toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

export const FORMAL_QUOTE_COLORS = {
  navy: "#1a2a6c",
  navyDark: "#121a3a",
  gold: "#e8d5b5",
  goldDark: "#c9b896",
  goldTint: "#f3ead6",
  muted: "#5a6372",
  border: "#dce0e8",
} as const;
