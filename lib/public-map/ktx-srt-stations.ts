/** KTX·SRT 정차역 화이트리스트 — 좌표·운영사 고정 (Overpass 태그 불안정 대비) */

export type RailOperator = "ktx" | "srt" | "both";

export type KtxSrtStation = {
  id: string;
  nameKo: string;
  lat: number;
  lng: number;
  operator: RailOperator;
};

/** 운영 중 KTX·SRT 정차역 (2026 기준 주요 정차역) */
export const KTX_SRT_STATIONS: readonly KtxSrtStation[] = [
  { id: "seoul", nameKo: "서울역", lat: 37.554683, lng: 126.970604, operator: "ktx" },
  { id: "yongsan", nameKo: "용산역", lat: 37.529849, lng: 126.964561, operator: "ktx" },
  { id: "suseo", nameKo: "수서역", lat: 37.487462, lng: 127.101562, operator: "both" },
  { id: "yeongdeungpo", nameKo: "영등포역", lat: 37.515504, lng: 126.907619, operator: "ktx" },
  { id: "haengsin", nameKo: "행신역", lat: 37.611995, lng: 126.834221, operator: "ktx" },
  { id: "gwangmyeong", nameKo: "광명역", lat: 37.416332, lng: 126.884466, operator: "ktx" },
  { id: "suwon", nameKo: "수원역", lat: 37.265831, lng: 126.999887, operator: "ktx" },
  { id: "dongtan", nameKo: "동탄역", lat: 37.200308, lng: 127.074821, operator: "srt" },
  { id: "jije", nameKo: "지제역", lat: 37.018277, lng: 127.070883, operator: "srt" },
  { id: "cheonan-asan", nameKo: "천안아산역", lat: 36.794673, lng: 127.104834, operator: "both" },
  { id: "osong", nameKo: "오송역", lat: 36.620393, lng: 127.32701, operator: "both" },
  { id: "gongju", nameKo: "공주역", lat: 36.477289, lng: 127.141689, operator: "ktx" },
  { id: "seodaejeon", nameKo: "서대전역", lat: 36.323562, lng: 127.389473, operator: "ktx" },
  { id: "daejeon", nameKo: "대전역", lat: 36.332503, lng: 127.434205, operator: "both" },
  { id: "gimcheon-gumi", nameKo: "김천구미역", lat: 36.139225, lng: 128.113594, operator: "both" },
  { id: "dongdaegu", nameKo: "동대구역", lat: 35.879477, lng: 128.628662, operator: "both" },
  { id: "singyeongju", nameKo: "신경주역", lat: 35.798642, lng: 129.139374, operator: "both" },
  { id: "miryang", nameKo: "밀양역", lat: 35.493405, lng: 128.748926, operator: "srt" },
  { id: "ulsan", nameKo: "울산역", lat: 35.551431, lng: 129.138504, operator: "both" },
  { id: "busan", nameKo: "부산역", lat: 35.11509, lng: 129.040298, operator: "both" },
  { id: "gwangju-songjeong", nameKo: "광주송정역", lat: 35.137922, lng: 126.790892, operator: "ktx" },
  { id: "naju", nameKo: "나주역", lat: 35.015625, lng: 126.710781, operator: "ktx" },
  { id: "mokpo", nameKo: "목포역", lat: 34.792472, lng: 126.386795, operator: "ktx" },
  { id: "suncheon", nameKo: "순천역", lat: 34.945678, lng: 127.511423, operator: "ktx" },
  { id: "yeosu-expo", nameKo: "여수엑스포역", lat: 34.745567, lng: 127.761789, operator: "ktx" },
  { id: "iksan", nameKo: "익산역", lat: 35.940456, lng: 126.945978, operator: "ktx" },
  { id: "jeonju", nameKo: "전주역", lat: 35.849228, lng: 127.162345, operator: "ktx" },
  { id: "pohang", nameKo: "포항역", lat: 36.032178, lng: 129.365012, operator: "srt" },
  { id: "gangneung", nameKo: "강릉역", lat: 37.751853, lng: 128.876057, operator: "ktx" },
  { id: "wonju", nameKo: "원주역", lat: 37.342178, lng: 127.950267, operator: "ktx" },
  { id: "jecheon", nameKo: "제천역", lat: 37.126712, lng: 128.205489, operator: "ktx" },
  { id: "cheongnyangni", nameKo: "청량리역", lat: 37.5804, lng: 127.046767, operator: "ktx" },
  { id: "pyeongchang", nameKo: "평창역", lat: 37.370712, lng: 128.390089, operator: "ktx" },
  { id: "jinbu", nameKo: "진부역", lat: 37.687456, lng: 128.552341, operator: "ktx" },
] as const;

export const KTX_COLOR = "#003478";
export const SRT_COLOR = "#6B2C91";
export const KTX_SRT_BOTH_COLOR = "#4A3D8F";

export function railOperatorLabel(operator: RailOperator): string {
  if (operator === "ktx") return "KTX";
  if (operator === "srt") return "SRT";
  return "KTX·SRT";
}

export function railOperatorColor(operator: RailOperator): string {
  if (operator === "ktx") return KTX_COLOR;
  if (operator === "srt") return SRT_COLOR;
  return KTX_SRT_BOTH_COLOR;
}
