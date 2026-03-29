/**
 * 상권·공공 상세 API 없을 때 보조 추정 (서울 자치구 중심).
 * 실제 유동과 다를 수 있으므로 관리자가 수동 보정 가능.
 */

const SEOUL_GU_BASE: Record<string, number> = {
  강남구: 240_000,
  서초구: 220_000,
  송파구: 210_000,
  마포구: 195_000,
  영등포구: 200_000,
  중구: 215_000,
  종로구: 190_000,
  용산구: 185_000,
  성동구: 175_000,
  광진구: 165_000,
  동대문구: 160_000,
  중랑구: 145_000,
  성북구: 150_000,
  강북구: 130_000,
  도봉구: 125_000,
  노원구: 155_000,
  은평구: 140_000,
  서대문구: 155_000,
  양천구: 150_000,
  강서구: 170_000,
  구로구: 155_000,
  금천구: 120_000,
  관악구: 165_000,
  동작구: 145_000,
  강동구: 160_000,
};

function blob(city: string, district: string): string {
  return `${city} ${district}`.toLowerCase();
}

/** 서울이면 구 단위, 부산/제주/그 외는 광역 단위 기본값 */
export function estimateFootfallFromAdminDistrict(params: {
  city: string | null | undefined;
  district: string | null | undefined;
}): number {
  const city = (params.city ?? "").trim();
  const district = (params.district ?? "").trim();
  const b = blob(city, district);

  if (b.includes("서울") || city.includes("서울")) {
    if (district && SEOUL_GU_BASE[district]) return SEOUL_GU_BASE[district];
    return 130_000;
  }
  if (b.includes("부산")) return 95_000;
  if (b.includes("제주") || b.includes("서귀포")) return 55_000;
  if (
    b.includes("대구") ||
    b.includes("인천") ||
    b.includes("광주") ||
    b.includes("대전") ||
    b.includes("울산")
  ) {
    return 85_000;
  }
  return 70_000;
}
