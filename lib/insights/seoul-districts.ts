/** 서울 25개 자치구 (OOH 시장 히트맵 기준) */
export const SEOUL_GU_LIST = [
  "종로구",
  "중구",
  "용산구",
  "성동구",
  "광진구",
  "동대문구",
  "중랑구",
  "성북구",
  "강북구",
  "도봉구",
  "노원구",
  "은평구",
  "서대문구",
  "마포구",
  "양천구",
  "강서구",
  "구로구",
  "금천구",
  "영등포구",
  "동작구",
  "관악구",
  "서초구",
  "강남구",
  "송파구",
  "강동구",
] as const;

export type SeoulGu = (typeof SEOUL_GU_LIST)[number];

export type DistrictPriceTier = "high" | "mid-high" | "mid" | "low";

export function parseSeoulGu(
  district?: string | null,
  region?: string | null,
  location?: string | null,
): SeoulGu | null {
  const text = [district, region, location].filter(Boolean).join(" ");
  for (const gu of SEOUL_GU_LIST) {
    const short = gu.replace("구", "");
    if (text.includes(gu) || text.includes(short)) return gu;
  }
  return null;
}

export function tierFromPriceRank(
  price: number,
  min: number,
  max: number,
): DistrictPriceTier {
  if (max <= min) return "mid";
  const t = (price - min) / (max - min);
  if (t >= 0.75) return "high";
  if (t >= 0.5) return "mid-high";
  if (t >= 0.25) return "mid";
  return "low";
}

export const DISTRICT_TIER_COLORS: Record<DistrictPriceTier, string> = {
  high: "#ef4444",
  "mid-high": "#f97316",
  mid: "#eab308",
  low: "#fde047",
};
