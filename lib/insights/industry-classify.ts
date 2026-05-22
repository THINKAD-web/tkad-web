/** 광고주명·캠페인 라벨에서 업종 추론 (자체 DB 휴리스틱) */
export function industryFromText(text: string): string {
  const t = text.toLowerCase();
  if (/뷰티|beauty|cosmetic|화장|skincare|메이크업/.test(t)) return "뷰티·패션";
  if (/f&b|식음|카페|food|restaurant|배달/.test(t)) return "F&B";
  if (/it|tech|테크|앱|스타트|software|saas/.test(t)) return "IT·테크";
  if (/패션|fashion|의류|apparel/.test(t)) return "패션";
  if (/금융|finance|bank|보험|insurance/.test(t)) return "금융";
  if (/리테일|retail|백화|mart|쇼핑/.test(t)) return "리테일";
  if (/자동차|auto|mobility|차량/.test(t)) return "자동차";
  if (/엔터|entertain|game|게임/.test(t)) return "엔터·게임";
  return "기타";
}

export const COMPETITIVE_INDUSTRIES = [
  "뷰티·패션",
  "F&B",
  "IT·테크",
  "패션",
  "금융",
  "리테일",
  "자동차",
  "엔터·게임",
  "기타",
] as const;

const INDUSTRY_SHORT_KO: Record<string, string> = {
  "뷰티·패션": "뷰티",
  "F&B": "F&B",
  "IT·테크": "IT",
  "패션": "패션",
  "금융": "금융",
  "리테일": "리테일",
  "자동차": "자동차",
  "엔터·게임": "엔터",
  "기타": "브랜드",
};

const INDUSTRY_SHORT_EN: Record<string, string> = {
  "뷰티·패션": "Beauty",
  "F&B": "F&B",
  "IT·테크": "IT",
  "패션": "Fashion",
  "금융": "Finance",
  "리테일": "Retail",
  "자동차": "Auto",
  "엔터·게임": "Entertainment",
  "기타": "Brand",
};

/** 익명 브랜드 라벨 — 실제 광고주명 미노출 */
export function anonymizeBrandName(
  sourceText: string,
  index: number,
  isKo: boolean,
): string {
  const industry = industryFromText(sourceText);
  const letter = String.fromCharCode(65 + (index % 26));
  if (isKo) {
    const short = INDUSTRY_SHORT_KO[industry] ?? "브랜드";
    return `${short} 브랜드 ${letter}사`;
  }
  const short = INDUSTRY_SHORT_EN[industry] ?? "Brand";
  return `${short} brand ${letter}`;
}

export function industryLabel(industry: string, isKo: boolean): string {
  if (isKo) return industry;
  const map: Record<string, string> = {
    "뷰티·패션": "Beauty & fashion",
    "F&B": "F&B",
    "IT·테크": "IT & tech",
    "패션": "Fashion",
    "금융": "Finance",
    "리테일": "Retail",
    "자동차": "Automotive",
    "엔터·게임": "Entertainment",
    "기타": "Other",
  };
  return map[industry] ?? industry;
}

const TYPE_LABEL_KO: Record<string, string> = {
  digital: "DOOH",
  static: "빌보드·옥외",
  mobile: "이동형",
  network: "네트워크",
  subway: "지하철",
};

const TYPE_LABEL_EN: Record<string, string> = {
  digital: "DOOH",
  static: "Billboard",
  mobile: "Transit",
  network: "Network",
  subway: "Subway",
};

export function mediaTypeLabel(type: string, isKo: boolean): string {
  const map = isKo ? TYPE_LABEL_KO : TYPE_LABEL_EN;
  return map[type] ?? type;
}
