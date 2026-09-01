import type { MediaItem } from "@/lib/media-data";

/** SEO 마케팅 유형 슬러그 (`/[locale]/type/[mediaType]`) */
export const MARKETING_MEDIA_TYPE_SLUGS = [
  "billboard",
  "subway",
  "dooh",
] as const;

export type MarketingMediaTypeSlug = (typeof MARKETING_MEDIA_TYPE_SLUGS)[number];

const DEFS: Record<
  MarketingMediaTypeSlug,
  {
    labelKo: string;
    labelEn: string;
    introKo: string;
    introEn: string;
    prosKo: string[];
    prosEn: string[];
    consKo: string[];
    consEn: string[];
    industriesKo: string[];
    industriesEn: string[];
    budgetKo: string;
    budgetEn: string;
    faqsKo: { q: string; a: string }[];
    faqsEn: { q: string; a: string }[];
  }
> = {
  billboard: {
    labelKo: "빌보드·고정형 옥외광고",
    labelEn: "Billboard & static OOH",
    introKo:
      "고정형 빌보드·월패널·건물 외벽 광고는 장기간 브랜드 메시지를 노출하기에 적합합니다. 강남·홍대·간선도로 등 핵심 지점에서 높은 시인성을 확보할 수 있습니다.",
    introEn:
      "Static billboards and building wraps deliver sustained brand presence at landmark locations with strong visibility.",
    prosKo: ["장기 노출·브랜드 각인", "대형 사이즈로 임팩트", "지역 상권 타깃팅 용이"],
    prosEn: ["Long exposure", "Large-format impact", "Local trade-area targeting"],
    consKo: ["소재 교체·제작 리드타임", "실시간 메시지 변경 제한"],
    consEn: ["Production lead time", "Limited real-time updates"],
    industriesKo: ["자동차", "금융", "럭셔리", "대형 리테일"],
    industriesEn: ["Automotive", "Finance", "Luxury", "Large retail"],
    budgetKo: "월 500만원~ (지점·규격별 상이)",
    budgetEn: "From ~₩5M/month depending on site and size",
    faqsKo: [
      {
        q: "빌보드 광고 최소 집행 기간은?",
        a: "매체마다 다르지만 보통 2주~1개월 단위가 일반적입니다. THINKAD에서 기간별 견적을 확인하세요.",
      },
      {
        q: "디지털 전광판과 빌보드 차이는?",
        a: "빌보드는 고정 소재·장기 노출, 디지털(DOOH)은 영상 교체·시간대 타깃이 가능합니다.",
      },
    ],
    faqsEn: [
      {
        q: "What is the minimum booking period?",
        a: "Typically 2 weeks to 1 month; check each listing on THINKAD for terms.",
      },
    ],
  },
  subway: {
    labelKo: "지하철·교통 옥외광고",
    labelEn: "Subway & transit OOH",
    introKo:
      "지하철역 스크린·조명광고·버스·택시 래핑 등 이동·통근 동선 매체는 출퇴근·상업 지역 유동을 반복 노출합니다. 대량 도달·프리퀀시가 강점입니다.",
    introEn:
      "Subway screens, station lightboxes, and transit wraps reach commuters with high frequency across dense urban routes.",
    prosKo: ["출퇴근·상업권 반복 노출", "노선·역사 단위 타깃", "합리적 CPM 구간"],
    prosEn: ["Commute frequency", "Line/station targeting", "Efficient CPM bands"],
    consKo: ["짧은 시청 시간", "소재 규격 제약"],
    consEn: ["Short dwell time", "Format constraints"],
    industriesKo: ["F&B", "뷰티", "앱·핀테크", "이벤트"],
    industriesEn: ["F&B", "Beauty", "Apps", "Events"],
    budgetKo: "월 300만원~ (노선·기간별)",
    budgetEn: "From ~₩3M/month by line and duration",
    faqsKo: [
      {
        q: "지하철 광고 효과가 있나요?",
        a: "역사·환승 구간 유동이 높은 노선은 브랜드 리콜과 앱 설치 캠페인에서 검증된 사례가 많습니다.",
      },
    ],
    faqsEn: [
      {
        q: "Is subway OOH effective?",
        a: "High-traffic hubs often show strong recall; see THINKAD case studies for benchmarks.",
      },
    ],
  },
  dooh: {
    labelKo: "디지털 옥외광고(DOOH)",
    labelEn: "Digital OOH (DOOH)",
    introKo:
      "디지털 사이니지·미디어월·전광판은 영상·시간대·요일 스케줄링이 가능합니다. 강남·홍대·성수 등 핵심 상권 DOOH는 론칭·프로모션에 자주 활용됩니다.",
    introEn:
      "Digital signage and LED walls support video, dayparting, and rapid creative rotation — ideal for launches and promos.",
    prosKo: ["영상·동적 소재", "시간대 타깃", "짧은 집행·즉시 예약(일부)"],
    prosEn: ["Video creatives", "Daypart targeting", "Shorter flights on select sites"],
    consKo: ["프리미엄 단가 구간", "슬롯·재고 확인 필요"],
    consEn: ["Premium tiers", "Inventory checks required"],
    industriesKo: ["테크", "엔터", "패션", "신제품 론칭"],
    industriesEn: ["Tech", "Entertainment", "Fashion", "Product launches"],
    budgetKo: "월 500만~3,000만원 (규모·기간별)",
    budgetEn: "₩5M–30M+/month by scale and duration",
    faqsKo: [
      {
        q: "전광판 광고비는 어떻게 책정되나요?",
        a: "위치·규격·시간대·집행 기간에 따라 달라집니다. THINKAD에서 매체별 월 단가와 예상 노출을 확인하세요.",
      },
    ],
    faqsEn: [
      {
        q: "How is DOOH pricing set?",
        a: "By location, size, dayparts, and flight length — compare listings on THINKAD.",
      },
    ],
  },
};

export function isMarketingMediaTypeSlug(
  s: string,
): s is MarketingMediaTypeSlug {
  return (MARKETING_MEDIA_TYPE_SLUGS as readonly string[]).includes(s);
}

export function marketingTypeDef(slug: MarketingMediaTypeSlug) {
  return DEFS[slug];
}

function haystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.subCategory,
    m.type,
    ...(m.tags ?? []),
    m.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function inferMarketingTypeSlug(
  m: MediaItem,
): MarketingMediaTypeSlug | null {
  const h = haystack(m);
  if (
    m.type === "dooh" ||
    /dooh|디지털|전광|사이니지|led|미디어월|스크린/.test(h)
  ) {
    return "dooh";
  }
  if (
    m.type === "mobile" ||
    /지하철|subway|역사|버스|택시|교통|transit|쉘터/.test(h)
  ) {
    return "subway";
  }
  if (
    m.type === "static" ||
    /빌보드|billboard|월패널|외벽|고정/.test(h)
  ) {
    return "billboard";
  }
  return null;
}

export function matchesMarketingMediaType(
  m: MediaItem,
  slug: MarketingMediaTypeSlug,
): boolean {
  const inferred = inferMarketingTypeSlug(m);
  if (inferred === slug) return true;
  if (slug === "dooh" && m.type === "dooh") return true;
  if (slug === "subway" && m.type === "mobile") return true;
  if (slug === "billboard" && m.type === "static") return true;
  return false;
}

export function marketingTypeLabel(
  m: Pick<MediaItem, "type" | "name" | "subCategory" | "tags">,
  locale: string,
): string {
  const slug = inferMarketingTypeSlug(m as MediaItem);
  if (!slug) return "";
  const isKo = locale === "ko" || locale.startsWith("ko");
  return isKo ? DEFS[slug].labelKo : DEFS[slug].labelEn;
}

export function marketingTypeLandingTitle(
  slug: MarketingMediaTypeSlug,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const nKo = count > 0 ? `${count}개` : "";
  const nEn = count > 0 ? String(count) : "";

  if (isKo) {
    switch (slug) {
      case "billboard":
        return nKo
          ? `전광판 광고 단가 ${nKo} 비교 | 위치·월 비용·견적 | THINKAD`
          : "전광판 광고 단가 비교 | 위치·월 비용·견적 | THINKAD";
      case "subway":
        return nKo
          ? `지하철·교통 광고 비용 ${nKo} | 역·노선별 단가 비교 | THINKAD`
          : "지하철·교통 광고 비용 | 역·노선별 단가 비교 | THINKAD";
      case "dooh":
        return nKo
          ? `디지털·DOOH 광고 단가 ${nKo} | 미디어폴·전광 단가 | THINKAD`
          : "디지털·DOOH 광고 단가 | 미디어폴·전광 단가 | THINKAD";
    }
  }

  switch (slug) {
    case "billboard":
      return nEn
        ? `Billboard ad pricing — ${nEn} placements | THINKAD`
        : "Billboard ad pricing — compare costs | THINKAD";
    case "subway":
      return nEn
        ? `Subway & transit ad costs — ${nEn} placements | THINKAD`
        : "Subway & transit ad costs | THINKAD";
    case "dooh":
      return nEn
        ? `DOOH pricing — ${nEn} digital placements | THINKAD`
        : "DOOH & digital signage pricing | THINKAD";
  }
}

export function marketingTypeHeroTitle(
  slug: MarketingMediaTypeSlug,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const nKo = count > 0 ? `${count}개` : "";
  const nEn = count > 0 ? String(count) : "";

  if (isKo) {
    switch (slug) {
      case "billboard":
        return nKo
          ? `전광판 광고 단가 — ${nKo} 매체 비교`
          : "전광판 광고 단가 비교";
      case "subway":
        return nKo
          ? `지하철·교통 광고 비용 — ${nKo} 매체`
          : "지하철·교통 광고 비용 비교";
      case "dooh":
        return nKo
          ? `디지털·DOOH 광고 단가 — ${nKo} 매체`
          : "디지털·DOOH 광고 단가 비교";
    }
  }

  switch (slug) {
    case "billboard":
      return nEn
        ? `Billboard pricing — ${nEn} verified media`
        : "Billboard ad pricing comparison";
    case "subway":
      return nEn
        ? `Subway & transit costs — ${nEn} placements`
        : "Subway & transit advertising costs";
    case "dooh":
      return nEn
        ? `DOOH pricing — ${nEn} placements`
        : "DOOH & digital signage pricing";
  }
}

export function marketingTypeLandingDescription(
  slug: MarketingMediaTypeSlug,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const label = isKo ? DEFS[slug].labelKo : DEFS[slug].labelEn;
  const countKo = count > 0 ? `${count}개 ` : "";
  const countEn = count > 0 ? `${count} ` : "";
  if (isKo) {
    return `${label} ${countKo}매체. 위치·월 단가·예상 노출을 비교하고 즉시 견적하세요. THINKAD 싱커드.`;
  }
  return `Compare ${countEn}${label} placements — monthly rates, locations, and quotes on THINKAD.`;
}
