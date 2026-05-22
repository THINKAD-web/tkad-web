/** 온라인 광고 채널 — OOH 연계 통합 플래너용 (벤치마크 기반 추정) */
export type DigitalChannelId = "naver_gfa" | "kakao_moment" | "meta_ig";

export type DigitalChannel = {
  id: DigitalChannelId;
  nameKo: string;
  nameEn: string;
  vendorKo: string;
  vendorEn: string;
  targetingKo: string;
  targetingEn: string;
  /** 평균 CPC (원) — 업계 벤치마크 */
  avgCpcWon: number;
  /** 평균 CPM (원) */
  avgCpmWon: number;
  /** 예상 CTR */
  ctr: number;
  /** OOH 목표별 적합도 0~1 */
  goalAffinity: Record<string, number>;
};

export const DIGITAL_CHANNELS: DigitalChannel[] = [
  {
    id: "naver_gfa",
    nameKo: "네이버 GFA",
    nameEn: "Naver GFA",
    vendorKo: "네이버",
    vendorEn: "Naver",
    targetingKo: "지역·연령·관심사 타겟 배너",
    targetingEn: "Geo, age & interest banner ads",
    avgCpcWon: 420,
    avgCpmWon: 7200,
    ctr: 0.012,
    goalAffinity: {
      brand: 0.9,
      launch: 0.85,
      local: 0.95,
      sales: 0.88,
      event: 0.8,
    },
  },
  {
    id: "kakao_moment",
    nameKo: "카카오 모먼트",
    nameEn: "Kakao Moment",
    vendorKo: "카카오",
    vendorEn: "Kakao",
    targetingKo: "지역·행동·재타겟팅",
    targetingEn: "Geo, behavioral & retargeting",
    avgCpcWon: 380,
    avgCpmWon: 6500,
    ctr: 0.014,
    goalAffinity: {
      brand: 0.85,
      launch: 0.9,
      local: 0.92,
      sales: 0.9,
      event: 0.88,
    },
  },
  {
    id: "meta_ig",
    nameKo: "인스타그램 / 메타",
    nameEn: "Instagram / Meta",
    vendorKo: "Meta",
    vendorEn: "Meta",
    targetingKo: "지역·연령·관심사·룩얼라이크",
    targetingEn: "Geo, age, interests & lookalike",
    avgCpcWon: 520,
    avgCpmWon: 8900,
    ctr: 0.009,
    goalAffinity: {
      brand: 0.92,
      launch: 0.88,
      local: 0.78,
      sales: 0.82,
      event: 0.9,
    },
  },
];

export function getDigitalChannel(id: DigitalChannelId): DigitalChannel | undefined {
  return DIGITAL_CHANNELS.find((c) => c.id === id);
}

/** OOH+디지털 동시 집행 시 브랜드 리프트 배수 (리서치 벤치마크) */
export const OOH_DIGITAL_SYNERGY_LIFT = 2.3;
