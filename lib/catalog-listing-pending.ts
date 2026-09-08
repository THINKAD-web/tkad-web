/**
 * 입점대기 — 카탈로그에 없거나 전용 slug가 없는 매체 유형 안내.
 * 제안서·견적서에서 재사용. 매체 상세·어드민 확장은 이 모듈만 확장하면 된다.
 */

export type CatalogListingStatus = "available" | "partial" | "pending";

export type CatalogListingKind =
  | "intercity_bus_terminal"
  | "express_bus_terminal"
  | "delivery_vehicle"
  | "train_station"
  | "subway"
  | "bus_shelter"
  | "bus_wrap"
  | "billboard";

export type CatalogListingDef = {
  kind: CatalogListingKind;
  status: CatalogListingStatus;
  labelKo: string;
  labelEn: string;
  /** 자유문장 매칭 */
  match: RegExp;
};

export type CatalogListingNotice = {
  kind: CatalogListingKind;
  status: CatalogListingStatus;
  labelKo: string;
  labelEn: string;
  lineKo: string;
  lineEn: string;
};

/**
 * 카탈로그 조사 기준 (2026-09):
 * - 시외버스터미널: 전용 유형·매체 없음 → pending
 * - 시외·고속버스터미널: ktx_terminal/digital_signage 이름 매칭만 → partial
 * - 택배차량: vehicle_wrap generic (~5) → partial
 * - 기차역/KTX: ktx_terminal bucket → partial
 */
export const CATALOG_LISTING_DEFS: readonly CatalogListingDef[] = [
  {
    kind: "intercity_bus_terminal",
    status: "pending",
    labelKo: "시외버스터미널",
    labelEn: "Intercity bus terminal",
    match: /시외\s*버스\s*터미널|시외버스터미널/i,
  },
  {
    kind: "express_bus_terminal",
    status: "partial",
    labelKo: "시외·고속버스터미널",
    labelEn: "Express bus terminal",
    match: /시외\s*[·•]?\s*고속\s*버스\s*터미널|고속\s*버스\s*터미널|고속버스터미널/i,
  },
  {
    kind: "delivery_vehicle",
    status: "partial",
    labelKo: "택배차량",
    labelEn: "Delivery vehicle wrap",
    match: /택배\s*(?:차량|트럭|카보|배송)/i,
  },
  {
    kind: "train_station",
    status: "partial",
    labelKo: "기차역·KTX역",
    labelEn: "Train / KTX station",
    match: /기차역|ktx\s*역|ktx역|srt\s*역/i,
  },
  {
    kind: "subway",
    status: "available",
    labelKo: "지하철",
    labelEn: "Subway",
    match: /지하철|subway/i,
  },
  {
    kind: "bus_shelter",
    status: "available",
    labelKo: "버스 정류장",
    labelEn: "Bus shelter",
    match: /버스\s*정류장|버스정류장|bus\s*shelter/i,
  },
  {
    kind: "bus_wrap",
    status: "available",
    labelKo: "버스 래핑",
    labelEn: "Bus wrap",
    match: /버스\s*(?:래핑|랩핑)|bus\s*wrap/i,
  },
  {
    kind: "billboard",
    status: "available",
    labelKo: "전광판",
    labelEn: "Billboard",
    match: /전광판|빌보드|billboard/i,
  },
];

const NOTICE_KO: Record<CatalogListingStatus, (label: string) => string> = {
  pending: (label) => `입점대기 — ${label}은 현재 등록 준비 중`,
  partial: (label) => `일부만 매칭됨 — ${label} 전용 상품 입점대기`,
  available: (label) => label,
};

const NOTICE_EN: Record<CatalogListingStatus, (label: string) => string> = {
  pending: (label) => `Listing pending — ${label} is being onboarded`,
  partial: (label) => `Partial match — dedicated ${label} inventory is listing pending`,
  available: (label) => label,
};

export function listingNoticeFromDef(def: CatalogListingDef): CatalogListingNotice {
  return {
    kind: def.kind,
    status: def.status,
    labelKo: def.labelKo,
    labelEn: def.labelEn,
    lineKo: NOTICE_KO[def.status](def.labelKo),
    lineEn: NOTICE_EN[def.status](def.labelEn),
  };
}

/** 자유문장에서 pending/partial 안내만 추출 (available은 결과에서 생략) */
export function parseCatalogListingNotices(text: string): CatalogListingNotice[] {
  const t = text.trim();
  if (!t) return [];
  const out: CatalogListingNotice[] = [];
  for (const def of CATALOG_LISTING_DEFS) {
    if (def.status === "available") continue;
    if (def.match.test(t)) out.push(listingNoticeFromDef(def));
  }
  return out;
}

export function listingPendingSectionTitle(isKo: boolean): string {
  return isKo ? "입점대기 매체" : "Listing pending";
}

export function listingPendingLines(
  notices: readonly CatalogListingNotice[],
  isKo: boolean,
): string[] {
  return notices.map((n) => (isKo ? n.lineKo : n.lineEn));
}

export function listingPendingExportSection(
  text: string | null | undefined,
  isKo: boolean,
): { title: string; lines: string[] } | null {
  const notices = parseCatalogListingNotices(text ?? "");
  if (notices.length === 0) return null;
  return {
    title: listingPendingSectionTitle(isKo),
    lines: listingPendingLines(notices, isKo),
  };
}

export function withListingPendingSection<
  T extends { sections?: { title: string; lines: string[] }[] },
>(payload: T, text: string | null | undefined, isKo: boolean): T {
  const section = listingPendingExportSection(text, isKo);
  if (!section) return payload;
  return {
    ...payload,
    sections: [...(payload.sections ?? []), section],
  };
}

/** 제안서·견적서 공통 — 기존 추정 면책과 같은 톤 */
export const INVENTORY_SNAPSHOT_DISCLAIMER_KO =
  "매체 구성은 작성 시점 기준이며, 실제 계약 시점의 재고·입점 현황과 100% 일치하지 않을 수 있습니다.";

export const INVENTORY_SNAPSHOT_DISCLAIMER_EN =
  "Media mix reflects inventory at the time of writing and may not match stock or listing status at contract.";

export const QUOTE_INVENTORY_DISCLAIMER_KO =
  "본 견적서의 매체 구성은 작성 시점 기준이며, 실제 계약 시점의 재고·입점 현황과 100% 일치하지 않을 수 있습니다.";

export const QUOTE_INVENTORY_DISCLAIMER_EN =
  "This quote's media mix reflects inventory at the time of writing and may not match stock or listing status at contract.";

export function withInventoryDisclaimer(base: string, isKo: boolean): string {
  const extra = isKo
    ? INVENTORY_SNAPSHOT_DISCLAIMER_KO
    : INVENTORY_SNAPSHOT_DISCLAIMER_EN;
  if (base.includes(extra) || base.includes("입점 현황") || base.includes("listing status")) {
    return base;
  }
  return `${base.trim()} ${extra}`;
}
