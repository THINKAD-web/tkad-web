import { CONTACT_EMAIL } from "@/lib/constants";

/** Formal quote issuer block — PDF·HTML 미리보기 공통 (Hq8에서 실데이터 교체) */
export function getFormalQuoteIssuer() {
  return {
    companyKo: "(주)싱커드",
    companyEn: "THINKAD Inc.",
    taglineKo: "OOH 광고 · 미디어 플래닝",
    taglineEn: "OOH advertising & media planning",
    address:
      process.env.QUOTE_ISSUER_ADDRESS?.trim() ||
      "서울특별시 (주소는 환경변수 QUOTE_ISSUER_ADDRESS로 설정)",
    regNo:
      process.env.QUOTE_ISSUER_REG_NO?.trim() || "사업자등록번호: (등록 후 입력)",
    tel: process.env.QUOTE_ISSUER_TEL?.trim() || "02-515-2772",
    email: process.env.QUOTE_ISSUER_EMAIL?.trim() || CONTACT_EMAIL,
    bank: process.env.QUOTE_BANK_NAME?.trim() || "국민은행",
    account: process.env.QUOTE_BANK_ACCOUNT?.trim() || "000000-00-000000",
    holder: process.env.QUOTE_BANK_HOLDER?.trim() || "(주)싱커드",
    salesTitle: process.env.QUOTE_SALES_TITLE?.trim() || "견적·제안",
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
