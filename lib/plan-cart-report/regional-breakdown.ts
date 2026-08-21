import type { MediaItem } from "@/lib/media-data";
import {
  plannerMediaPeriodLineWon,
  plannerMonthlyPriceWonForMedia,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import { calculatePlan } from "@/lib/planner/calc/engine";
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


/** 담은 매체를 지역별로 묶어 예산·노출·도달 지표 산출 */
/**
 * 지역별 예산·노출 집계.
 *
 * A-1 Wave 2 — 기간 처리를 `calculatePlan` 으로 넘겼다.
 * 기존에는 `Math.max(1, months)` 클램프 때문에 30일 미만 캠페인에서
 * 기간을 전혀 반영하지 못해, 같은 보고서의 매체 표와 금액이 어긋났다
 * (21일 캠페인: 매체 표 490만 vs 지역 표 700만).
 *
 * 지역 grouping 은 `planReportRegionKey` 를 그대로 쓴다. 네트워크 지역
 * 정규화·위치 힌트가 들어간 표시 택소노미라 엔진의 권역 코드와 다르다.
 * 숫자만 엔진에서 가져오고 묶는 기준은 바꾸지 않는다.
 *
 * 추정 도달 열은 제거했다. 포화 모델을 지역 단위로 쪼개면 매체 1개 그룹에서
 * 상수(노출의 40.1%)만 반복되기 때문이다.
 */
export function computePlanCartRegionalBreakdown(
  portfolio: readonly MediaItem[],
  months: number,
  isKo: boolean,
  pricing?: PlannerPortfolioPricing,
): PlannerExportRegionBreakdown[] {
  if (portfolio.length === 0) return [];

  const periodCtx = { months: months > 0 ? months : 1 };

  const plan = calculatePlan({
    media: portfolio.map((item) => ({
      media: item,
      units: pricing?.quantities?.[item.id],
      // 매체 표의 line total 과 같은 함수를 쓴다 — 두 표의 합계가 일치해야 한다.
      itemNet: plannerMediaPeriodLineWon(item, periodCtx, pricing, isKo),
    })),
    period: { kind: "months", months: periodCtx.months },
    budgetWon: 0,
    locale: isKo ? "ko" : "en",
  });

  const planById = new Map(plan.mediaItems.map((m) => [m.id, m]));

  const groups = new Map<string, MediaItem[]>();
  for (const item of portfolio) {
    const key = planReportRegionKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const totalMonthlyWon = portfolio.reduce(
    (s, item) =>
      s +
      plannerMonthlyPriceWonForMedia(
        item,
        pricing?.quantities,
        pricing?.priceOptionIndex,
      ),
    0,
  );
  const totalMonthlyImp = plan.impressions.monthlyEquivalent;

  const rows: PlannerExportRegionBreakdown[] = [];

  for (const [regionKey, media] of groups.entries()) {
    const monthlyBudgetWon = media.reduce(
      (s, item) =>
        s +
        plannerMonthlyPriceWonForMedia(
          item,
          pricing?.quantities,
          pricing?.priceOptionIndex,
        ),
      0,
    );
    const planRows = media
      .map((item) => planById.get(item.id))
      .filter((r): r is NonNullable<typeof r> => r != null);

    const monthlyImpressions = planRows.reduce(
      (s, r) => s + r.monthlyImpressions,
      0,
    );
    const totalImpressions = planRows.reduce(
      (s, r) => s + r.campaignImpressions,
      0,
    );
    const periodBudgetWon = planRows.reduce((s, r) => s + r.itemNet, 0);

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
      cpmKrw:
        totalImpressions > 0 && periodBudgetWon > 0
          ? Math.round(periodBudgetWon / (totalImpressions / 1000))
          : null,
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
    const cpm =
      r.cpmKrw != null && r.cpmKrw > 0
        ? isKo
          ? ` · CPM ₩${r.cpmKrw.toLocaleString("ko-KR")}`
          : ` · CPM ₩${r.cpmKrw.toLocaleString("en-US")}`
        : "";
    return isKo
      ? `${r.label} — 매체 ${r.mediaCount}개 · ${budget} · ${imp}${cpm}`
      : `${r.label} — ${r.mediaCount} media · ${budget} · ${imp}${cpm}`;
  });
}
