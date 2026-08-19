/**
 * Phase 4a-3 audit — region_main 불일치 7건 수기 정정 목록.
 * city/district 기준 실제 소재지 → browse regionMain.
 */
export type RegionMainCorrection = {
  id: string;
  name: string;
  /** 현재 DB regionMain (검증용) */
  fromRegionMain: string;
  toRegionMain: string;
  /** 잘못된 seoul_* sub 제거 또는 district 기반 sub 설정 */
  toRegionSub: string | null;
  city: string;
  district: string;
  rationale: string;
};

export const REGION_MAIN_MISMATCH_CORRECTIONS: readonly RegionMainCorrection[] = [
  {
    id: "cmrm2f88q000204kydtp2vmzj",
    name: "전통시장 LED 전광판 광고",
    fromRegionMain: "seoul",
    toRegionMain: "gyeonggi",
    toRegionSub: "gyeonggi_bucheon",
    city: "경기",
    district: "부천시 원미구",
    rationale: "city=경기, district=부천시 원미구",
  },
  {
    id: "cmqrpy6vh00030ai366l1xgkn",
    name: "공항철도 검암역 개찰구 래핑 광고",
    fromRegionMain: "seoul",
    toRegionMain: "incheon",
    toRegionSub: "incheon_airport",
    city: "인천",
    district: "서구",
    rationale: "city=인천, district=서구 (공항철도)",
  },
  {
    id: "cmqrnc9uw00010bj7wh5uteyv",
    name: "공항철도 개찰구 래핑 Full Package 광고",
    fromRegionMain: "seoul",
    toRegionMain: "incheon",
    toRegionSub: "incheon_airport",
    city: "인천",
    district: "서구",
    rationale: "city=인천, district=서구 (공항철도)",
  },
  {
    id: "cmoy5jrdi000004i9543h9wb9",
    name: "대구 지하철 3호선 동대구역 대합실 디지털미디어 광고",
    fromRegionMain: "seoul",
    toRegionMain: "daegu",
    toRegionSub: "daegu_downtown",
    city: "대구",
    district: "동구",
    rationale: "city=대구, district=동구",
  },
  {
    id: "cmqrpnxqa00000bj9zhwkdlpj",
    name: "공항철도 김포공항역 개찰구 래핑 광고",
    fromRegionMain: "seoul",
    toRegionMain: "gyeonggi",
    toRegionSub: "gyeonggi_gimpo",
    city: "경기도",
    district: "김포시",
    rationale: "city=경기, district=김포시",
  },
  {
    id: "cmqt7egdr000104l54jc6hrmc",
    name: "광역전철 스티커 + 듀얼 LCD Full Package 광고",
    fromRegionMain: "seoul",
    toRegionMain: "gyeonggi",
    toRegionSub: "gyeonggi_seongnam",
    city: "경기",
    district: "성남시 분당구",
    rationale: "city=경기, district=성남시 분당구",
  },
  {
    id: "cmqt906rj00000ajlt4lmwchi",
    name: "지하철 1호선 부평역 스크린도어 광고",
    fromRegionMain: "seoul",
    toRegionMain: "incheon",
    toRegionSub: "incheon_downtown",
    city: "인천",
    district: "부평구",
    rationale: "city=인천, district=부평구",
  },
];
