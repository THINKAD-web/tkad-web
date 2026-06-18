import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan, catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  computeAdvancedPlannerMetrics,
  formatPlannerSharePct,
} from "@/lib/planner-logic";
import {
  NETWORK_REGION_META,
  normalizeNetworkRegionKey,
} from "@/lib/network-media-stats";
import type { PlannerExportRegionBreakdown } from "@/lib/planner-report-export/types";

const REGION_FALLBACK_LABELS: Record<string, { ko: string; en: string }> = {
  seoul: { ko: "서울", en: "Seoul" },
  busan: { ko: "부산", en: "Busan" },
  jeju: { ko: "제주", en: "Jeju" },
  national: { ko: "전국", en: "Nationwide" },
  gyeonggi: { ko: "경기", en: "Gyeonggi" },
  incheon: { ko: "인천", en: "Incheon" },
  daegu: { ko: "대구", en: "Daegu" },
  gwangju: { ko: "광주", en: "Gwangju" },
  daejeon: { ko: "대전", en: "Daejeon" },
  other: { ko: "기타", en: "Other" },
};

const LOCATION_REGION_HINTS: { pattern: RegExp; key: string }[] = [
  {
    pattern:
      /부산|busan|해운대|광안리|서면|센텀|남포|명지(?:점|동|역)?|금정구|연제구|수영구|부산진구|해운대구|동래구|사하구|사상구/i,
    key: "busan",
  },
  {
    pattern:
      /(?:^|[^가-힣])대구|대구광역시|daegu|동성로|동대구|반월당/i,
    key: "daegu",
  },
  { pattern: /대전|daejeon|둔산|유성구|유성온천|으능정이|목척교/i, key: "daejeon" },
  { pattern: /광주|gwangju/i, key: "gwangju" },
  { pattern: /서울|seoul/i, key: "seoul" },
  { pattern: /경기|gyeonggi|수원|성남|용인|고양|분당/i, key: "gyeonggi" },
  { pattern: /인천|incheon/i, key: "incheon" },
  { pattern: /제주|jeju|서귀포/i, key: "jeju" },
  { pattern: /전국|nationwide|national/i, key: "national" },
];

function isKnownRegionKey(key: string): boolean {
  return Boolean(NETWORK_REGION_META[key] || REGION_FALLBACK_LABELS[key]);
}

function resolveRegionFromLocationText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // LOCATION_REGION_HINTS 먼저 (해운대구 ⊃ 대구 오매칭 방지)
  for (const { pattern, key } of LOCATION_REGION_HINTS) {
    if (pattern.test(trimmed) && key !== "national") return key;
  }

  const fromNetwork = normalizeNetworkRegionKey(trimmed, "");
  if (fromNetwork !== "other") return fromNetwork;

  return null;
}

function mediaAddressHaystack(
  m: Pick<
    MediaItem,
    "city" | "district" | "location" | "locationEn" | "regionSub" | "regionZone"
  >,
): string {
  return [m.city, m.district, m.location, m.locationEn, m.regionSub, m.regionZone]
    .filter(Boolean)
    .join(" ");
}

/** 카트·한글 지역명 등 단일 문자열 → 표준 region key */
export function normalizePlanCartRegionKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered !== "national" && isKnownRegionKey(lowered)) return lowered;

  const fromNetwork = normalizeNetworkRegionKey(trimmed, "");
  if (fromNetwork !== "other") return fromNetwork;

  for (const { pattern, key } of LOCATION_REGION_HINTS) {
    if (pattern.test(trimmed) && key !== "national") return key;
  }
  return null;
}

function mediaGeographicHaystack(catalog: MediaItem): string {
  return mediaAddressHaystack(catalog);
}

function resolveRegionFromCatalogGeography(catalog: MediaItem): string | null {
  const fromAddress = resolveRegionFromLocationText(mediaGeographicHaystack(catalog));
  if (fromAddress && fromAddress !== "national") return fromAddress;

  const fromRegionMain = normalizePlanCartRegionKey(catalog.regionMain ?? "");
  if (fromRegionMain && fromRegionMain !== "national") return fromRegionMain;

  const fromName = resolveRegionFromLocationText(
    [catalog.name, catalog.nameEn].filter(Boolean).join(" "),
  );
  if (fromName && fromName !== "national") return fromName;

  return null;
}

/** 플랜 카트 항목 + 카탈로그 → 보고서용 단일 지역 키 (매체명은 사용하지 않음) */
export function resolvePlanCartItemRegionKey(
  cartRegion: string,
  catalog: MediaItem,
): string {
  // 주소·regionMain 우선 — cart.region 은 DB legacy `seoul` 오염이 흔함
  const fromGeography = resolveRegionFromCatalogGeography(catalog);
  if (fromGeography) return fromGeography;

  const fromCartText = resolveRegionFromLocationText(cartRegion.trim());
  if (fromCartText && fromCartText !== "national") return fromCartText;

  const fromCartCode = normalizePlanCartRegionKey(cartRegion);
  if (fromCartCode && fromCartCode !== "national") return fromCartCode;

  const isNationwide =
    fromCartCode === "national" ||
    cartRegion.trim().toLowerCase() === "national" ||
    catalog.region?.trim().toLowerCase() === "national" ||
    /전국|nationwide/i.test(mediaGeographicHaystack(catalog));
  if (isNationwide) return "national";

  const fromCatalogRegion = normalizePlanCartRegionKey(catalog.region ?? "");
  if (fromCatalogRegion && fromCatalogRegion !== "national") return fromCatalogRegion;

  return fromCartCode ?? fromCatalogRegion ?? "other";
}

export function planReportRegionKey(m: MediaItem): string {
  const candidates = [m.regionMain, m.region, m.regionZone].filter(
    Boolean,
  ) as string[];

  // resolvePlanCartPortfolio 가 세팅한 지역 키 우선
  for (const raw of candidates) {
    const key = normalizePlanCartRegionKey(raw);
    if (key) return key;
  }

  // 주소·행정구역만 사용 (전국 패키지 매체명에 '서울'이 있어도 오분류 방지)
  const fromAddress = resolveRegionFromLocationText(mediaAddressHaystack(m));
  if (fromAddress) return fromAddress;

  for (const raw of candidates) {
    if (raw.trim().toLowerCase() === "national") return "national";
  }
  if (m.region?.trim().toLowerCase() === "national") return "national";

  const last = m.region?.trim().toLowerCase();
  if (last && isKnownRegionKey(last)) return last;

  return "other";
}

export function planReportRegionSortOrder(key: string): number {
  const meta = NETWORK_REGION_META[key];
  if (meta) return meta.order;
  if (key === "national") return 8;
  if (key === "other") return 99;
  if (REGION_FALLBACK_LABELS[key]) return 90;
  return 98;
}

export function planReportRegionLabel(key: string, isKo: boolean): string {
  const meta = NETWORK_REGION_META[key];
  if (meta) return isKo ? meta.labelKo : meta.labelEn;
  const fb = REGION_FALLBACK_LABELS[key];
  if (fb) return isKo ? fb.ko : fb.en;
  return key;
}

function regionSortOrder(key: string): number {
  return planReportRegionSortOrder(key);
}

function monthlyImpressionsOf(m: MediaItem): number {
  return Math.max(0, Math.round((m.dailyFootTraffic ?? 0) * 30));
}

/** 담은 매체를 지역별로 묶어 예산·노출·도달 지표 산출 */
export function computePlanCartRegionalBreakdown(
  portfolio: readonly MediaItem[],
  months: number,
  isKo: boolean,
): PlannerExportRegionBreakdown[] {
  if (portfolio.length === 0) return [];

  const m = Math.max(1, months);
  const groups = new Map<string, MediaItem[]>();
  for (const item of portfolio) {
    const key = planReportRegionKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const totalMonthlyWon = portfolio.reduce(
    (s, item) => s + catalogPriceFieldToWon(item.price),
    0,
  );
  const totalMonthlyImp = portfolio.reduce(
    (s, item) => s + monthlyImpressionsOf(item),
    0,
  );

  const rows: PlannerExportRegionBreakdown[] = [];

  for (const [regionKey, media] of groups.entries()) {
    const monthlyBudgetWon = media.reduce(
      (s, item) => s + catalogPriceFieldToWon(item.price),
      0,
    );
    const monthlyImpressions = media.reduce(
      (s, item) => s + monthlyImpressionsOf(item),
      0,
    );
    const totalImpressions = monthlyImpressions * m;
    const periodBudgetWon = monthlyBudgetWon * m;
    const budgetMan = Math.max(
      0.01,
      media.reduce((s, item) => s + catalogPriceFieldToPriceMan(item.price), 0),
    );
    const advanced = computeAdvancedPlannerMetrics({
      portfolio: media,
      budgetMan,
      months: m,
    });

    rows.push({
      regionKey,
      label: planReportRegionLabel(regionKey, isKo),
      mediaCount: media.length,
      monthlyBudgetWon,
      periodBudgetWon,
      budgetPct:
        totalMonthlyWon > 0
          ? Math.round((monthlyBudgetWon / totalMonthlyWon) * 1000) / 10
          : 0,
      monthlyImpressions,
      totalImpressions,
      impressionPct:
        totalMonthlyImp > 0
          ? Math.round((monthlyImpressions / totalMonthlyImp) * 1000) / 10
          : 0,
      uniqueReach: advanced?.uniqueReach ?? 0,
      cpmKrw: advanced?.cpmKrw ?? null,
    });
  }

  return rows.sort(
    (a, b) => regionSortOrder(a.regionKey) - regionSortOrder(b.regionKey),
  );
}

export function regionalBreakdownSectionLines(
  rows: PlannerExportRegionBreakdown[],
  isKo: boolean,
): string[] {
  return rows.map((r) => {
    const budget = isKo
      ? `월 ${r.monthlyBudgetWon.toLocaleString("ko-KR")}원 (${formatPlannerSharePct(r.budgetPct)})`
      : `₩${r.monthlyBudgetWon.toLocaleString("en-US")}/mo (${formatPlannerSharePct(r.budgetPct)})`;
    const imp = isKo
      ? `월 노출 ${r.monthlyImpressions.toLocaleString("ko-KR")}회 · 기간 ${r.totalImpressions.toLocaleString("ko-KR")}회 (${formatPlannerSharePct(r.impressionPct)})`
      : `${r.monthlyImpressions.toLocaleString("en-US")} imp/mo · ${r.totalImpressions.toLocaleString("en-US")} total (${formatPlannerSharePct(r.impressionPct)})`;
    const reach =
      r.uniqueReach > 0
        ? isKo
          ? ` · 추정 도달 ${r.uniqueReach.toLocaleString("ko-KR")}명`
          : ` · est. reach ${r.uniqueReach.toLocaleString("en-US")}`
        : "";
    const cpm =
      r.cpmKrw != null && r.cpmKrw > 0
        ? isKo
          ? ` · CPM ₩${r.cpmKrw.toLocaleString("ko-KR")}`
          : ` · CPM ₩${r.cpmKrw.toLocaleString("en-US")}`
        : "";
    return isKo
      ? `${r.label} — 매체 ${r.mediaCount}개 · ${budget} · ${imp}${reach}${cpm}`
      : `${r.label} — ${r.mediaCount} media · ${budget} · ${imp}${reach}${cpm}`;
  });
}
