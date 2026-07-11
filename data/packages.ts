/**
 * @deprecated 레거시 에디토리얼 패키지 정의.
 * 공개 `/media/packages` SSOT 는 `lib/media-package-seed-data.ts` + DB `MediaPackage`.
 * industry 링크는 `lib/industry-package-links.ts` 로 이관됨.
 * 이 파일은 `lib/media-packages.ts` / `PackageCard` 호환용으로만 유지 — 신규 코드에서 import 금지.
 *
 * 지역별 OOH 패키지 큐레이션 — 에디토리얼 메타 + 카탈로그 매체 ID.
 * 런타임 집계(노출·가격)는 `lib/media-packages.ts` 에서 public catalog 기준 계산.
 */

export type PackageIndustryBadge =
  | "beauty"
  | "tech"
  | "entertainment"
  | "fashion"
  | "fmcg"
  | "finance"
  | "tourism"
  | "luxury"
  | "lifestyle"
  | "fnb"
  | "global"
  | "retail"
  | "telecom"
  | "corporate";

/** 패키지 구매 목적 (필터 탭과 1:1 대응) */
export type PackagePurpose = "brand" | "launch" | "popup" | "coverage";

export type MediaPackageDefinition = {
  slug: string;
  nameKo: string;
  nameEn: string;
  taglineKo: string;
  taglineEn: string;
  descriptionKo: string;
  descriptionEn: string;
  /** 카드 상단 지역 태그 (예: "강남/서초") */
  regionLabelKo: string;
  regionLabelEn: string;
  /** 필터 탭 매핑 — 1개 이상 */
  purposes: PackagePurpose[];
  /** 카드에 표시할 매체 수 범위 라벨 (사람이 작성, 자동 계산보다 우선) */
  mediaCountRangeKo: string;
  mediaCountRangeEn: string;
  /** 카드에 표시할 예상 노출 라벨 */
  expectedImpressionsLabelKo: string;
  expectedImpressionsLabelEn: string;
  /** 카드에 표시할 예산 범위 라벨 */
  budgetRangeLabelKo: string;
  budgetRangeLabelEn: string;
  /** "추천 이유" 한 줄 (카드 보조 설명) */
  recommendReasonKo: string;
  recommendReasonEn: string;
  /** DB·키워드 카탈로그 매체 ID — 빈 배열 허용 */
  mediaIds: string[];
  industryBadges: PackageIndustryBadge[];
  /** 목록 카드 정렬 (낮을수록 상단) */
  sortOrder: number;
  /** 카드 액센트 — 그라데이션 / 다크 모드 톤에서 공통으로 사용 */
  accent: "violet" | "rose" | "cyan" | "amber" | "indigo";
};

export const MEDIA_PACKAGES: MediaPackageDefinition[] = [
  {
    slug: "gangnam-premium",
    sortOrder: 1,
    accent: "violet",
    nameKo: "강남 프리미엄 루트",
    nameEn: "Gangnam Premium Route",
    taglineKo: "고가시성 전광판 + 미디어폴 시그니처 묶음",
    taglineEn: "Signature high-visibility billboards & media poles",
    descriptionKo:
      "강남·서초 핵심 상권의 고가시성 전광판과 미디어폴을 조합한 프리미엄 패키지. 럭셔리·테크 론칭에 적합합니다.",
    descriptionEn:
      "Premium pack combining high-visibility billboards and media poles across Gangnam & Seocho — built for luxury and tech launches.",
    regionLabelKo: "강남/서초",
    regionLabelEn: "Gangnam/Seocho",
    purposes: ["brand", "launch"],
    mediaCountRangeKo: "4–6개",
    mediaCountRangeEn: "4–6 placements",
    expectedImpressionsLabelKo: "월 3,200만+ 노출",
    expectedImpressionsLabelEn: "32M+ imp / mo",
    budgetRangeLabelKo: "월 2,000~4,000만원",
    budgetRangeLabelEn: "₩20M–40M / mo",
    recommendReasonKo:
      "구매력 높은 2030 직장인 집중 상권 — 첫 인상부터 프리미엄을 보여줄 수 있는 코어 매체로 구성됨.",
    recommendReasonEn:
      "Hub of high-spending 20–30s office workers — anchored on premium core inventory.",
    mediaIds: [
      "2",
      "3",
      "4",
      "gn_teherrain_mediawall_007",
      "snh_gangnamdaero_010",
    ],
    industryBadges: ["beauty", "fashion", "luxury"],
  },
  {
    slug: "seongsu-hannam",
    sortOrder: 2,
    accent: "rose",
    nameKo: "성수·한남 감성 루트",
    nameEn: "Seongsu · Hannam Vibe",
    taglineKo: "MZ 핫플레이스 브랜디드 매체 모음",
    taglineEn: "Branded media in MZ hotspots",
    descriptionKo:
      "MZ세대 핫플레이스 성수동·한남동의 브랜디드 옥외매체를 모은 감성 패키지. 인스타 인증·팝업과 시너지가 좋습니다.",
    descriptionEn:
      "Branded outdoor placements across Seongsu and Hannam — strongest synergy with pop-ups and IG-worthy moments.",
    regionLabelKo: "성수/한남",
    regionLabelEn: "Seongsu/Hannam",
    purposes: ["brand", "popup"],
    mediaCountRangeKo: "3–5개",
    mediaCountRangeEn: "3–5 placements",
    expectedImpressionsLabelKo: "월 1,800만+ 노출",
    expectedImpressionsLabelEn: "18M+ imp / mo",
    budgetRangeLabelKo: "월 1,200~2,500만원",
    budgetRangeLabelEn: "₩12M–25M / mo",
    recommendReasonKo:
      "인스타그램 인증 명소 동선 위에 위치 — 팝업 스토어·뉴 컬렉션 런칭과 시너지가 가장 좋은 구성.",
    recommendReasonEn:
      "Sits on the IG-check-in route — strongest leverage for pop-ups and new-collection launches.",
    mediaIds: ["5", "6", "ss_led_002", "ss_yeonmujang_glass_008", "4"],
    industryBadges: ["beauty", "fashion", "lifestyle", "fnb"],
  },
  {
    slug: "downtown-coverage",
    sortOrder: 3,
    accent: "indigo",
    nameKo: "서울 도심 광역 커버",
    nameEn: "Seoul Downtown Wide Cover",
    taglineKo: "시청·광화문·을지로 직장인 동선 풀커버",
    taglineEn: "City Hall · Gwanghwamun · Euljiro daily route",
    descriptionKo:
      "시청·광화문·을지로 오피스 밀집 지역의 대형 전광판으로 서울 도심 출퇴근 동선을 전방위 노출합니다.",
    descriptionEn:
      "Large billboards across City Hall, Gwanghwamun and Euljiro office cores — covering Seoul’s commute path end to end.",
    regionLabelKo: "도심/광화문",
    regionLabelEn: "Downtown/Gwanghwamun",
    purposes: ["brand", "coverage"],
    mediaCountRangeKo: "5–8개",
    mediaCountRangeEn: "5–8 placements",
    expectedImpressionsLabelKo: "월 5,500만+ 노출",
    expectedImpressionsLabelEn: "55M+ imp / mo",
    budgetRangeLabelKo: "월 3,000~6,000만원",
    budgetRangeLabelEn: "₩30M–60M / mo",
    recommendReasonKo:
      "직장인 출퇴근 동선을 가장 길게 커버 — 금융·통신·B2B 브랜딩에 최적.",
    recommendReasonEn:
      "Longest commute coverage — strongest fit for finance, telecom, and B2B branding.",
    mediaIds: ["md_static_005", "yp_led_004", "3", "snh_gangnamdaero_010", "2"],
    industryBadges: ["finance", "tech", "corporate"],
  },
  {
    slug: "kpop-fandom",
    sortOrder: 4,
    accent: "cyan",
    nameKo: "K-콘텐츠 팬덤 패키지",
    nameEn: "K-Content Fandom Pack",
    taglineKo: "코엑스·홍대·이태원 엔터·관광 핫스팟",
    taglineEn: "COEX · Hongdae · Itaewon entertainment hotspots",
    descriptionKo:
      "코엑스·홍대·이태원의 디지털 옥외매체를 묶어 외국인 관광객 + 팬덤 유입을 동시에 잡는 엔터 패키지.",
    descriptionEn:
      "Bundles digital outdoor in COEX, Hongdae, and Itaewon — captures foreign visitors and the K-content fandom in one shot.",
    regionLabelKo: "코엑스/홍대/이태원",
    regionLabelEn: "COEX/Hongdae/Itaewon",
    purposes: ["launch", "popup"],
    mediaCountRangeKo: "4–6개",
    mediaCountRangeEn: "4–6 placements",
    expectedImpressionsLabelKo: "월 2,400만+ 노출",
    expectedImpressionsLabelEn: "24M+ imp / mo",
    budgetRangeLabelKo: "월 1,500~3,000만원",
    budgetRangeLabelEn: "₩15M–30M / mo",
    recommendReasonKo:
      "외국인 관광객 + 팬덤 유입이 동시 집중 — K-팝·뷰티·F&B 글로벌 캠페인에 최적.",
    recommendReasonEn:
      "Tourists and K-content fandoms overlap here — ideal for K-pop, beauty, and F&B global campaigns.",
    mediaIds: ["1", "coex_led_006", "hd_led_003", "hd_walkstreet_panel_009", "10"],
    industryBadges: ["entertainment", "beauty", "fnb", "global"],
  },
  {
    slug: "national-launch",
    sortOrder: 5,
    accent: "amber",
    nameKo: "전국 주요도시 론칭",
    nameEn: "National Major-City Launch",
    taglineKo: "서울·부산·대구·광주 동시 노출",
    taglineEn: "Seoul · Busan · Daegu · Gwangju in one go",
    descriptionKo:
      "서울·부산·대구·광주 동시 집행으로 전국 브랜드 인지도를 단기간에 확보하는 광역 론칭 패키지.",
    descriptionEn:
      "Hits Seoul, Busan, Daegu, and Gwangju in one buy — fastest path to nationwide brand awareness.",
    regionLabelKo: "전국 (서울·부산·대구·광주)",
    regionLabelEn: "National (SE/PU/DG/GJ)",
    purposes: ["brand", "coverage", "launch"],
    mediaCountRangeKo: "8–12개",
    mediaCountRangeEn: "8–12 placements",
    expectedImpressionsLabelKo: "월 9,000만+ 노출",
    expectedImpressionsLabelEn: "90M+ imp / mo",
    budgetRangeLabelKo: "월 5,000만원~1억원",
    budgetRangeLabelEn: "₩50M–100M / mo",
    recommendReasonKo:
      "전국 동시 캠페인을 가장 효율적으로 구성 — 소비재·유통·금융·통신 신규 런칭에 권장.",
    recommendReasonEn:
      "Most efficient way to run a true nationwide push — suited to FMCG, retail, finance and telecom launches.",
    mediaIds: ["1", "7", "8", "9", "12", "13"],
    industryBadges: ["fmcg", "retail", "finance", "telecom"],
  },
];

export const MEDIA_PACKAGES_BY_SLUG: Record<string, MediaPackageDefinition> =
  Object.fromEntries(MEDIA_PACKAGES.map((p) => [p.slug, p]));

export function getMediaPackageBySlug(
  slug: string,
): MediaPackageDefinition | undefined {
  return MEDIA_PACKAGES_BY_SLUG[slug];
}

export const PACKAGE_PURPOSE_KO: Record<PackagePurpose, string> = {
  brand: "브랜드 인지도",
  launch: "신제품 론칭",
  popup: "팝업·이벤트",
  coverage: "대형 커버리지",
};

export const PACKAGE_PURPOSE_EN: Record<PackagePurpose, string> = {
  brand: "Brand Awareness",
  launch: "Product Launch",
  popup: "Pop-up & Event",
  coverage: "Wide Coverage",
};
