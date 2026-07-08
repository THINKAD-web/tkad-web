const DIGIT = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"] as const;
const LARGE_UNITS = ["", "만", "억", "조"] as const;

/** 0–9999 구간 한글 읽기 (계약서 법률 문서 형식) */
function readUnder10000(n: number): string {
  if (n <= 0) return "";
  let out = "";
  const cheon = Math.floor(n / 1000);
  const baek = Math.floor((n % 1000) / 100);
  const sip = Math.floor((n % 100) / 10);
  const il = n % 10;
  if (cheon > 0) out += (cheon === 1 ? "" : DIGIT[cheon]) + "천";
  if (baek > 0) out += (baek === 1 ? "" : DIGIT[baek]) + "백";
  if (sip > 0) out += (sip === 1 ? "일십" : `${DIGIT[sip]!}십`);
  if (il > 0) out += DIGIT[il]!;
  return out;
}

/**
 * 원(KRW) 정수 → 계약서 한글 금액 (예: 2156000 → "이백일십오만육천원정")
 */
export function wonToKoreanLegalAmount(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "영원정";
  let n = Math.round(won);
  let result = "";
  for (let i = 0; n > 0 && i < LARGE_UNITS.length; i++) {
    const chunk = n % 10_000;
    if (chunk > 0) {
      result = readUnder10000(chunk) + LARGE_UNITS[i]! + result;
    }
    n = Math.floor(n / 10_000);
  }
  return `${result || "영"}원정`;
}
