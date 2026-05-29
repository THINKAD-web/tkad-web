import type { Metadata } from "next";
import { buildShareMetadata } from "@/lib/seo";
import type { MediaItem } from "@/lib/media-data";

export type SpecialHotspot = {
  id: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
};

export type SpecialGuideStep = {
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
};

export type SpecialFaqItem = {
  qKo: string;
  qEn: string;
  aKo: string;
  aEn: string;
};

export type SpecialLandingConfig = {
  slug: string;
  seoTitleKo: string;
  seoTitleEn: string;
  seoDescriptionKo: string;
  seoDescriptionEn: string;
  seoKeywordsKo: string[];
  eyebrowKo: string;
  eyebrowEn: string;
  headlineBeforeKo: string;
  headlineBeforeEn: string;
  headlineGradientKo: string;
  headlineGradientEn: string;
  headlineAfterKo?: string;
  headlineAfterEn?: string;
  subtitleKo: string;
  subtitleEn: string;
  icon: string;
  primaryCtaHref: string;
  primaryCtaKo: string;
  primaryCtaEn: string;
  secondaryCtaHref: string;
  secondaryCtaKo: string;
  secondaryCtaEn: string;
  mediaSectionTitleKo: string;
  mediaSectionTitleEn: string;
  mapSectionTitleKo: string;
  mapSectionTitleEn: string;
  guideSectionTitleKo: string;
  guideSectionTitleEn: string;
  faqSectionTitleKo: string;
  faqSectionTitleEn: string;
  hotspots: SpecialHotspot[];
  guideSteps: SpecialGuideStep[];
  faq: SpecialFaqItem[];
  filterMedia: (catalog: MediaItem[], limit?: number) => MediaItem[];
};

const FANDOM_HOTSPOTS: SpecialHotspot[] = [
  { id: "gangnam", nameKo: "강남역", nameEn: "Gangnam Station", lat: 37.4979, lng: 127.0276 },
  { id: "hongdae", nameKo: "홍대입구", nameEn: "Hongdae", lat: 37.5572, lng: 126.9236 },
  { id: "coex", nameKo: "코엑스", nameEn: "COEX", lat: 37.5125, lng: 127.1025 },
  { id: "myeongdong", nameKo: "명동", nameEn: "Myeongdong", lat: 37.5636, lng: 126.9869 },
];

const FANDOM_PRIORITY = [
  /강남역|강남대로|강남구/i,
  /홍대입구|홍대|마포/i,
  /코엑스|coex|삼성역/i,
  /신촌|연세|이대/i,
  /명동|중구/i,
];

function haystack(m: MediaItem): string {
  return [
    m.name,
    m.location,
    m.district,
    m.city,
    m.nearbyStations,
    m.nearbyLandmarks,
    ...(m.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function filterFandomPopularMedia(
  catalog: MediaItem[],
  limit = 12,
): MediaItem[] {
  const eligible = catalog.filter((m) => {
    const tags = (m.tags ?? []).map((t) => t.toLowerCase());
    const hasFandomTag =
      tags.some((t) => t.includes("fandom") || t.includes("팬덤")) ||
      (m.targetCategory ?? []).includes("fandom");
    const cats = new Set(m.mediaCategory ?? []);
    const hasCategory =
      cats.has("dooh") ||
      cats.has("subway") ||
      cats.has("subway_station") ||
      cats.has("media_pole") ||
      cats.has("mall_digital");
    return hasFandomTag || hasCategory;
  });

  const scored = eligible.map((m) => {
    const hay = haystack(m);
    let score = 0;
    FANDOM_PRIORITY.forEach((re, i) => {
      if (re.test(hay)) score += (FANDOM_PRIORITY.length - i) * 12;
    });
    if ((m.targetCategory ?? []).includes("fandom")) score += 8;
    if ((m.popularityScore ?? 0) > 0) score += Math.min(6, m.popularityScore! / 15);
    if (m.isVerified) score += 3;
    return { m, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.m.popularityScore ?? 0) - (a.m.popularityScore ?? 0);
  });

  return scored.slice(0, limit).map((s) => s.m);
}

export const SPECIAL_LANDING_CONFIGS: Record<string, SpecialLandingConfig> = {
  fandom: {
    slug: "fandom",
    seoTitleKo: "아이돌 생일광고 · 팬클럽 응원광고 | THINKAD",
    seoTitleEn: "K-pop birthday ads & fan support OOH | THINKAD",
    seoDescriptionKo:
      "강남역, 홍대, 코엑스 등 팬덤 광고 인기 매체를 한눈에 비교하고 바로 견적 받으세요",
    seoDescriptionEn:
      "Compare popular fandom OOH at Gangnam, Hongdae, COEX and get a quote.",
    seoKeywordsKo: [
      "아이돌 생일광고",
      "팬클럽 응원 광고",
      "팬덤 광고",
      "강남역 광고",
      "홍대 광고",
    ],
    eyebrowKo: "// SPECIAL · FANDOM",
    eyebrowEn: "// SPECIAL · FANDOM",
    headlineBeforeKo: "내 최애의 특별한 날을",
    headlineBeforeEn: "Make your bias's special day",
    headlineGradientKo: "더 빛나게",
    headlineGradientEn: "shine brighter",
    subtitleKo: "강남역부터 홍대까지, 팬덤 광고 핫스팟 매체를 한눈에",
    subtitleEn: "From Gangnam to Hongdae — fandom hotspots at a glance",
    icon: "🎤",
    primaryCtaHref: "/media?target=fandom&chip=subway",
    primaryCtaKo: "팬덤 광고 매체 보기",
    primaryCtaEn: "Browse fandom media",
    secondaryCtaHref: "/contact?topic=special-fandom",
    secondaryCtaKo: "무료 견적 받기",
    secondaryCtaEn: "Get a free quote",
    mediaSectionTitleKo: "팬덤 인기 매체 TOP",
    mediaSectionTitleEn: "Top fandom media",
    mapSectionTitleKo: "팬덤 광고 인기 지역",
    mapSectionTitleEn: "Popular fandom ad areas",
    guideSectionTitleKo: "팬덤 광고 집행 가이드",
    guideSectionTitleEn: "How to run a fandom campaign",
    faqSectionTitleKo: "자주 묻는 질문",
    faqSectionTitleEn: "FAQ",
    hotspots: FANDOM_HOTSPOTS,
    guideSteps: [
      {
        titleKo: "날짜·예산 결정",
        titleEn: "Set date & budget",
        bodyKo: "생일 당일 기준 D-14 이전 신청 권장",
        bodyEn: "Apply at least 14 days before the birthday",
      },
      {
        titleKo: "매체 선택",
        titleEn: "Choose media",
        bodyKo: "강남역 역사 > 홍대 거리 > 코엑스 실내",
        bodyEn: "Gangnam station > Hongdae street > COEX indoor",
      },
      {
        titleKo: "소재 제작",
        titleEn: "Creative assets",
        bodyKo: "1920×1080px / 아이돌 사진 + 메시지 · 소재 검수 D-7 이전 제출",
        bodyEn: "1920×1080px photo + message · Submit for review 7 days ahead",
      },
      {
        titleKo: "집행 인증",
        titleEn: "On-site proof",
        bodyKo: "현장 인증 사진 제공 · SNS 공유용 고화질 제공",
        bodyEn: "On-site photos + high-res files for SNS",
      },
    ],
    faq: [
      {
        qKo: "최소 집행 기간이 있나요?",
        qEn: "Is there a minimum booking period?",
        aKo: "DOOH는 1주일부터, 고정형은 최소 2주입니다.",
        aEn: "DOOH from 1 week; static formats from 2 weeks.",
      },
      {
        qKo: "소재에 아이돌 사진 써도 되나요?",
        qEn: "Can I use idol photos in creative?",
        aKo:
          "팬 제작 소재는 대부분 가능하나 매체사 정책 확인이 필요합니다. 상담 시 함께 검토해드립니다.",
        aEn:
          "Fan-made creatives are often OK; we review media policies with you.",
      },
      {
        qKo: "집행 인증 사진을 받을 수 있나요?",
        qEn: "Do you provide proof photos?",
        aKo: "네, 현장 인증 사진을 카카오톡 또는 이메일로 제공합니다.",
        aEn: "Yes — via KakaoTalk or email.",
      },
      {
        qKo: "예산이 적어도 가능한가요?",
        qEn: "Can I run ads on a small budget?",
        aKo: "50만원부터 가능한 매체가 있습니다. 예산에 맞는 매체를 추천해드립니다.",
        aEn: "Some media start around ₩500K/month. We match to your budget.",
      },
    ],
    filterMedia: filterFandomPopularMedia,
  },
};

export const KNOWN_SPECIAL_SLUGS = Object.keys(SPECIAL_LANDING_CONFIGS);

export function getSpecialLandingConfig(
  slug: string,
): SpecialLandingConfig | undefined {
  return SPECIAL_LANDING_CONFIGS[slug];
}

export function specialLandingMetadata(
  config: SpecialLandingConfig,
  locale: string,
): Metadata {
  const isKo = locale.startsWith("ko");
  const title = isKo ? config.seoTitleKo : config.seoTitleEn;
  const description = isKo ? config.seoDescriptionKo : config.seoDescriptionEn;
  return {
    title,
    description,
    keywords: isKo
      ? [...config.seoKeywordsKo, "THINKAD", "싱커드", "옥외광고"]
      : ["THINKAD", "OOH", "fandom ads", config.slug],
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/special/${config.slug}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}
