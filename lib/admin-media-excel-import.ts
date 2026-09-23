/**
 * 엑셀 행 → QuickAddMediaJson (OOH bulk-import 파이프라인, PR2).
 * Computed 필드는 변환 결과에 넣지 않음 — bulk-import lockdown과 이중 방어.
 */

import { normalizeCatalogMediaType } from "@/lib/media-auto-categorize";
import { LOCKED_FIELD_SNAKE_ALIASES } from "@/lib/media/locked-fields";
import type { QuickAddMediaJson } from "@/lib/media-quick-add";
import { coercePriceOptionPeriodForWrite } from "@/lib/media-price-period-write";

/** 1단계 매핑표 + 운영 표준 컬럼 (헤더 행과 대소문자·공백 무시 매칭) */
export const MEDIA_EXCEL_STANDARD_HEADERS = [
  "media_name",
  "full_address",
  "region",
  "main_category",
  "sub_category",
  "media_type",
  "width_m",
  "height_m",
  "resolution",
  "operating_hours",
  "target_category",
  "price_options",
  "price_note",
  "description",
  "image_urls",
  "notes",
] as const;

export type MediaExcelStandardHeader =
  (typeof MEDIA_EXCEL_STANDARD_HEADERS)[number];

export type MediaExcelRow = Partial<Record<MediaExcelStandardHeader, string>> & {
  /** 원본 시트 1-based 행 번호 (헤더 제외 후 데이터 행) */
  rowIndex: number;
};

export type MediaExcelRowFailure = {
  rowIndex: number;
  mediaName?: string;
  message: string;
};

export type MediaExcelConvertWarning = {
  rowIndex: number;
  message: string;
};

export type MediaExcelConvertResult = {
  items: QuickAddMediaJson[];
  failures: MediaExcelRowFailure[];
  warnings: MediaExcelConvertWarning[];
};

const COMPUTED_EXCEL_ALIASES = new Set([
  ...Object.keys(LOCKED_FIELD_SNAKE_ALIASES),
  "dailyFootfall",
  "weekdayFootfall",
  "impressions",
  "cpm",
  "visibilityScore",
  "visibility_score",
  "daily_footfall",
  "노출수",
  "유동인구",
]);

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

/** 시트 첫 행 → 표준 키 매핑 */
export function mapExcelHeaderRow(cells: string[]): Map<number, MediaExcelStandardHeader> {
  const map = new Map<number, MediaExcelStandardHeader>();
  const canonical = new Map(
    MEDIA_EXCEL_STANDARD_HEADERS.map((h) => [normHeader(h), h]),
  );
  cells.forEach((cell, i) => {
    const key = canonical.get(normHeader(cell));
    if (key) map.set(i, key);
  });
  return map;
}

/** 객체 행(헤더→값)으로 변환 */
export function excelGridToRows(
  grid: string[][],
  headerMap: Map<number, MediaExcelStandardHeader>,
): MediaExcelRow[] {
  const out: MediaExcelRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    const row: MediaExcelRow = { rowIndex: r + 1 };
    let empty = true;
    for (const [col, key] of headerMap) {
      const v = (cells[col] ?? "").trim();
      if (v) empty = false;
      if (v) row[key] = v;
    }
    if (!empty) out.push(row);
  }
  return out;
}

function parseNum(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/[,₩원\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type ParsedPriceOption = {
  label: string;
  price: number;
  period?: string;
};

/** JSON 배열 또는 `period:label:price` 파이프 구분 */
export function parsePriceOptionsCell(raw: string | undefined): ParsedPriceOption[] {
  const t = raw?.trim() ?? "";
  if (!t) return [];

  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const parsed = JSON.parse(t) as unknown;
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const out: ParsedPriceOption[] = [];
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const label = typeof o.label === "string" ? o.label.trim() : "";
        const price = Number(o.price);
        if (!label || !Number.isFinite(price)) continue;
        const period =
          typeof o.period === "string" ? o.period.trim() : undefined;
        out.push({ label, price: Math.round(price), period });
      }
      return out;
    } catch {
      return [];
    }
  }

  const out: ParsedPriceOption[] = [];
  for (const part of t.split("|")) {
    const seg = part.trim();
    if (!seg) continue;
    const pieces = seg.split(":").map((s) => s.trim());
    if (pieces.length < 2) continue;
    let period: string | undefined;
    let label: string;
    let priceRaw: string;
    if (pieces.length >= 3) {
      period = pieces[0];
      label = pieces[1]!;
      priceRaw = pieces.slice(2).join(":");
    } else {
      label = pieces[0]!;
      priceRaw = pieces[1]!;
    }
    const price = parseNum(priceRaw);
    if (price == null || price < 0) continue;
    out.push({ label, price, period });
  }
  return out;
}

function normalizePriceOptionsForQuickAdd(
  opts: ParsedPriceOption[],
): QuickAddMediaJson["price_options"] {
  if (opts.length === 0) return null;
  const rows: NonNullable<QuickAddMediaJson["price_options"]> = [];
  for (const o of opts) {
    const periodResult = coercePriceOptionPeriodForWrite(o.period);
    if (periodResult.kind === "error") continue;
    rows.push({
      label: o.label,
      price: o.price,
      ...(periodResult.kind === "ok" ? { period: periodResult.period } : {}),
    });
  }
  return rows.length > 0 ? rows : null;
}

function isOnlineMainCategory(raw: string | undefined): boolean {
  const t = (raw ?? "").trim().toLowerCase();
  return (
    t === "online" ||
    t === "온라인" ||
    t.includes("online") ||
    t.includes("네이버") ||
    t.includes("구글") ||
    t.includes("메타")
  );
}

function splitTags(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function collectComputedWarnings(
  row: Record<string, string | undefined>,
  rowIndex: number,
): MediaExcelConvertWarning[] {
  const warnings: MediaExcelConvertWarning[] = [];
  for (const [key, val] of Object.entries(row)) {
    if (!val?.trim()) continue;
    const nk = normHeader(key);
    if (COMPUTED_EXCEL_ALIASES.has(key) || COMPUTED_EXCEL_ALIASES.has(nk)) {
      warnings.push({
        rowIndex,
        message: `Computed 필드 "${key}"는 무시됩니다 (lockdown).`,
      });
    }
  }
  return warnings;
}

/** 단일 행 → QuickAdd (실패 시 null + message) */
export function convertExcelRowToQuickAdd(
  row: MediaExcelRow,
): { ok: true; item: QuickAddMediaJson } | { ok: false; message: string } {
  const name = row.media_name?.trim() ?? "";
  const address = row.full_address?.trim() ?? "";
  if (!name) {
    return { ok: false, message: "media_name 필수" };
  }
  if (!address) {
    return { ok: false, message: "full_address 필수" };
  }
  if (isOnlineMainCategory(row.main_category)) {
    return {
      ok: false,
      message: "온라인 매체는 이번 OOH 파이프라인 대상이 아닙니다.",
    };
  }

  const typeRaw = row.media_type?.trim().toLowerCase() ?? "";
  const catalogType = typeRaw ? normalizeCatalogMediaType(typeRaw) : null;
  if (typeRaw && !catalogType) {
    return {
      ok: false,
      message: `media_type "${typeRaw}" — dooh/static/mobile 중 하나 필요`,
    };
  }

  const priceOpts = normalizePriceOptionsForQuickAdd(
    parsePriceOptionsCell(row.price_options),
  );
  let pricePerMonth = priceOpts?.[0]?.price ?? 0;
  if (priceOpts && priceOpts.length > 0) {
    pricePerMonth = Math.min(...priceOpts.map((o) => o.price));
  }
  if (!Number.isFinite(pricePerMonth) || pricePerMonth < 0) {
    return { ok: false, message: "price_options 또는 유효한 가격 필요" };
  }

  const regionHint = row.region?.trim() ?? "";
  const cityFromRegion = regionHint.split(/[\s,/]+/)[0]?.trim() ?? "";

  const images = (row.image_urls ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const targetTags = splitTags(row.target_category);
  const subCat = row.sub_category?.trim() ?? "";

  const description = [row.description?.trim(), row.notes?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const item: QuickAddMediaJson = {
    media_name: name,
    description,
    sub_category: subCat,
    tags: targetTags,
    full_address: address,
    district: "",
    city: cityFromRegion,
    latitude: null,
    longitude: null,
    price_per_month: Math.round(pricePerMonth),
    price_note: row.price_note?.trim() ?? "",
    width_m: parseNum(row.width_m),
    height_m: parseNum(row.height_m),
    resolution: row.resolution?.trim() || null,
    operating_hours: row.operating_hours?.trim() ?? "",
    daily_footfall: null,
    weekday_footfall: null,
    target_age: row.target_category?.trim() ?? "",
    impressions: null,
    reach: null,
    frequency: null,
    cpm: null,
    engagement_rate: null,
    visibility_score: 0,
    effect_memo: row.notes?.trim() ?? "",
    extracted_images: images,
    nearby_facilities: "",
    nearby_stations: "",
    nearby_landmarks: "",
    past_advertisers: "",
    price_options: priceOpts,
    ...(catalogType ? { type: catalogType } : {}),
  };

  return { ok: true, item };
}

export function convertExcelRowsToQuickAdd(
  rows: MediaExcelRow[],
  extraComputedColumns?: Record<number, Record<string, string>>,
): MediaExcelConvertResult {
  const items: QuickAddMediaJson[] = [];
  const failures: MediaExcelRowFailure[] = [];
  const warnings: MediaExcelConvertWarning[] = [];

  for (const row of rows) {
    const extra = extraComputedColumns?.[row.rowIndex];
    if (extra) {
      warnings.push(...collectComputedWarnings(extra, row.rowIndex));
    }
    const converted = convertExcelRowToQuickAdd(row);
    if (!converted.ok) {
      failures.push({
        rowIndex: row.rowIndex,
        mediaName: row.media_name,
        message: converted.message,
      });
      continue;
    }
    items.push(converted.item);
  }

  return { items, failures, warnings };
}
