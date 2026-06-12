/** 온라인 광고 플랫폼 — OOH 연계 통합 플래너용 (벤치마크 기반 추정) */
export type DigitalChannelId =
  | "naver"
  | "kakao"
  | "google"
  | "meta"
  | "daangn"
  | "buzzvil"
  | "tiktok";

/** @deprecated persisted store 마이그레이션용 */
const LEGACY_CHANNEL_IDS: Record<string, DigitalChannelId> = {
  naver_gfa: "naver",
  kakao_moment: "kakao",
  meta_ig: "meta",
};

export function normalizeDigitalChannelId(
  id: string,
): DigitalChannelId | null {
  if (LEGACY_CHANNEL_IDS[id]) return LEGACY_CHANNEL_IDS[id];
  if (DIGITAL_CHANNELS.some((c) => c.id === id)) return id as DigitalChannelId;
  return null;
}

export function normalizeDigitalChannelIds(ids: string[]): DigitalChannelId[] {
  const out: DigitalChannelId[] = [];
  for (const raw of ids) {
    const n = normalizeDigitalChannelId(raw);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export type DigitalChannel = {
  id: DigitalChannelId;
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  icon: string;
  color: string;
  textColor?: string;
  synergyKo: string;
  synergyEn: string;
  badge?: string;
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
    id: "naver",
    nameKo: "네이버 GFA",
    nameEn: "Naver GFA",
    descriptionKo: "지역·연령·성별 정밀 타겟",
    descriptionEn: "Precise geo, age & gender targeting",
    icon: "N",
    color: "#03C75A",
    synergyKo: "OOH 집행 지역 동일 타겟 설정",
    synergyEn: "Mirror OOH flight geo targeting",
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
    id: "kakao",
    nameKo: "카카오 모먼트",
    nameEn: "Kakao Moment",
    descriptionKo: "카카오톡 연동, 생활권 타겟",
    descriptionEn: "KakaoTalk-linked life-zone targeting",
    icon: "K",
    color: "#FEE500",
    textColor: "#000000",
    synergyKo: "OOH 노출 후 카카오 리타겟",
    synergyEn: "Kakao retargeting after OOH exposure",
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
    id: "google",
    nameKo: "구글/유튜브",
    nameEn: "Google / YouTube",
    descriptionKo: "광범위 도달, 영상 광고",
    descriptionEn: "Broad reach & video ads",
    icon: "G",
    color: "#4285F4",
    synergyKo: "OOH 소재 영상으로 유튜브 연동",
    synergyEn: "Repurpose OOH creative on YouTube",
    avgCpcWon: 480,
    avgCpmWon: 8200,
    ctr: 0.011,
    goalAffinity: {
      brand: 0.88,
      launch: 0.92,
      local: 0.8,
      sales: 0.86,
      event: 0.85,
    },
  },
  {
    id: "meta",
    nameKo: "메타 (인스타/페이스북)",
    nameEn: "Meta (Instagram / Facebook)",
    descriptionKo: "MZ 타겟, 피드·스토리 광고",
    descriptionEn: "Gen MZ feed & story placements",
    icon: "M",
    color: "#0866FF",
    synergyKo: "OOH 비주얼 소재 재활용",
    synergyEn: "Reuse OOH visual assets",
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
  {
    id: "daangn",
    nameKo: "당근마켓",
    nameEn: "Karrot (Daangn)",
    descriptionKo: "동네 반경 타겟, 로컬 최강",
    descriptionEn: "Hyper-local radius targeting",
    icon: "🥕",
    color: "#FF7E36",
    synergyKo: "OOH 집행 반경 1km 완벽 매칭",
    synergyEn: "1km radius match to OOH flight",
    badge: "추천",
    avgCpcWon: 350,
    avgCpmWon: 5800,
    ctr: 0.016,
    goalAffinity: {
      brand: 0.75,
      launch: 0.8,
      local: 0.98,
      sales: 0.94,
      event: 0.82,
    },
  },
  {
    id: "buzzvil",
    nameKo: "버즈빌",
    nameEn: "Buzzvil",
    descriptionKo: "잠금화면 리워드 광고, 일 2억 노출",
    descriptionEn: "Lockscreen reward ads · 200M daily impressions",
    icon: "B",
    color: "#6366F1",
    synergyKo: "OOH 노출 후 폰 잠금화면 리타겟",
    synergyEn: "Retarget on phone lockscreen after OOH exposure",
    // 잠금화면 리워드 — 초대형 노출·저단가 (대량 인지)
    avgCpcWon: 260,
    avgCpmWon: 3200,
    ctr: 0.018,
    goalAffinity: {
      brand: 0.9,
      launch: 0.88,
      local: 0.7,
      sales: 0.78,
      event: 0.84,
    },
  },
  {
    id: "tiktok",
    nameKo: "틱톡 Ads",
    nameEn: "TikTok Ads",
    descriptionKo: "Z세대 특화, 숏폼 영상",
    descriptionEn: "Gen Z short-form video",
    icon: "T",
    color: "#000000",
    synergyKo: "OOH 소재 숏폼으로 바이럴",
    synergyEn: "OOH-to-short-form viral loop",
    avgCpcWon: 450,
    avgCpmWon: 7600,
    ctr: 0.013,
    goalAffinity: {
      brand: 0.86,
      launch: 0.9,
      local: 0.72,
      sales: 0.8,
      event: 0.95,
    },
  },
];

/** UI·문서용 별칭 */
export const DIGITAL_PLATFORMS = DIGITAL_CHANNELS;

export function getDigitalChannel(
  id: DigitalChannelId,
): DigitalChannel | undefined {
  return DIGITAL_CHANNELS.find((c) => c.id === id);
}

/** OOH+디지털 동시 집행 시 브랜드 리프트 배수 (리서치 벤치마크) */
export const OOH_DIGITAL_SYNERGY_LIFT = 2.3;
