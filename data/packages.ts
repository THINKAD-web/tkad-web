/**
 * 지역별 OOH 패키지 큐레이션 — 에디토리얼 메타 + 카탈로그 매체 ID.
 * 런타임 집계(노출·가격)는 `lib/media-packages.ts`에서 public catalog 기준으로 계산.
 */

export type PackageIndustryBadge =
  | "beauty"
  | "tech"
  | "entertainment"
  | "fashion"
  | "fmcg"
  | "finance"
  | "tourism";

export type MediaPackageDefinition = {
  slug: string;
  nameKo: string;
  nameEn: string;
  taglineKo: string;
  taglineEn: string;
  descriptionKo: string;
  descriptionEn: string;
  /** DB·키워드 카탈로그 매체 ID */
  mediaIds: string[];
  industryBadges: PackageIndustryBadge[];
  /** 목록 카드 정렬 (낮을수록 상단) */
  sortOrder: number;
  /** 카드 악센트 (브루탈 에디토리얼 톤) */
  accent: "hermes" | "violet" | "cyan" | "gold" | "rose";
};

export const MEDIA_PACKAGES: MediaPackageDefinition[] = [
  {
    slug: "gangnam-premium-route",
    sortOrder: 1,
    accent: "violet",
    nameKo: "강남 프리미엄 루트",
    nameEn: "Gangnam Premium Route",
    taglineKo: "강남·서초 핵심 전광면을 한 번에 잡는 시그니처 묶음",
    taglineEn: "Signature bundle across Gangnam & Seocho flagship screens",
    descriptionKo:
      "테헤란로·강남대로·청담 프리미엄 축의 고시인성 매체를 3~5면 단위로 큐레이션했습니다. 럭셔리·테크 론칭에 적합합니다.",
    descriptionEn:
      "Curated 3–5 high-visibility placements along Teheran-ro, Gangnam-daero, and Cheongdam premium corridors—ideal for luxury and tech launches.",
    mediaIds: ["2", "3", "4", "gn_teherrain_mediawall_007", "snh_gangnamdaero_010"],
    industryBadges: ["beauty", "tech", "finance"],
  },
  {
    slug: "seongsu-hannam-vibe",
    sortOrder: 2,
    accent: "rose",
    nameKo: "성수·한남 감성 루트",
    nameEn: "Seongsu · Hannam Vibe Route",
    taglineKo: "MZ·브랜디드 매체로 핫플 흐름을 따라가는 감성 패키지",
    taglineEn: "MZ-focused branded media along Seoul’s trend corridors",
    descriptionKo:
      "성수 연무장·역세권 디지털과 청담·한남 인접 프리미엄 면을 묶어, 패션·F&B·크리에이티브 브랜드의 스토리텔링 집행에 맞췄습니다.",
    descriptionEn:
      "Combines Seongsu hotspot digital/subway inventory with Cheongdam-adjacent premium faces—built for fashion, F&B, and creative storytelling.",
    mediaIds: ["5", "6", "ss_led_002", "ss_yeonmujang_glass_008", "4"],
    industryBadges: ["fashion", "beauty", "entertainment"],
  },
  {
    slug: "seoul-downtown-cover",
    sortOrder: 3,
    accent: "hermes",
    nameKo: "서울 도심 광역 커버",
    nameEn: "Seoul Downtown Wide Cover",
    taglineKo: "명동·여의도·강남대로 축 — 도심 고노출 멀티 스크린",
    taglineEn: "Myeongdong · Yeouido · Gangnam-daero high-reach mix",
    descriptionKo:
      "관광·직장인·쇼핑 유입이 겹치는 도심 랜드마크 면을 묶어, 시즌 캠페인·전국 론칭의 첫 스파크용 패키지로 설계했습니다.",
    descriptionEn:
      "Bundles landmark faces where tourism, office, and retail traffic overlap—designed as the opening spark for seasonal or national launches.",
    mediaIds: ["md_static_005", "yp_led_004", "3", "snh_gangnamdaero_010", "2"],
    industryBadges: ["fmcg", "tourism", "tech"],
  },
  {
    slug: "kpop-fandom-pack",
    sortOrder: 4,
    accent: "cyan",
    nameKo: "K-POP 팬덤 패키지",
    nameEn: "K-POP Fandom Pack",
    taglineKo: "코엑스·홍대·강남대로 — 팬덤·관광 동선 엔터 특화",
    taglineEn: "COEX · Hongdae · Gangnam-daero fan & tourist routes",
    descriptionKo:
      "대형 LED·홍대 핫플·코엑스 권역을 연결해, 앨범·콘서트·팬 이벤트 프로모션에 최적화된 엔터 OOH 묶음입니다.",
    descriptionEn:
      "Links mega LED, Hongdae hotspots, and COEX-zone inventory—optimized for album, tour, and fan-event promotions.",
    mediaIds: ["1", "coex_led_006", "hd_led_003", "hd_walkstreet_panel_009", "10"],
    industryBadges: ["entertainment", "fashion", "beauty"],
  },
  {
    slug: "national-city-launch",
    sortOrder: 5,
    accent: "gold",
    nameKo: "전국 주요도시 론칭 패키지",
    nameEn: "Major Cities Launch Pack",
    taglineKo: "서울·부산·제주 + 전국 네트워크로 동시 커버",
    taglineEn: "Seoul · Busan · Jeju plus nationwide network reach",
    descriptionKo:
      "수도권 플래그십과 부산·제주 관문, 전국 시내버스·고속도로 패키지를 묶어, 브랜드 론칭·관광 캠페인의 광역 인지도 확보용입니다.",
    descriptionEn:
      "Pairs capital flagship placements with Busan/Jeju gateways and nationwide bus/highway packages for broad launch awareness.",
    mediaIds: ["1", "7", "8", "9", "12", "13"],
    industryBadges: ["fmcg", "tourism", "finance"],
  },
];

export const MEDIA_PACKAGES_BY_SLUG: Record<string, MediaPackageDefinition> =
  Object.fromEntries(MEDIA_PACKAGES.map((p) => [p.slug, p]));

export function getMediaPackageBySlug(
  slug: string,
): MediaPackageDefinition | undefined {
  return MEDIA_PACKAGES_BY_SLUG[slug];
}
