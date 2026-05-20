import { CATALOG_MEDIA_TYPES, isValidCatalogMediaType } from "@/lib/media-auto-categorize";
import { deriveRegionFromAddress } from "@/lib/media-json-enrich";

export const MEDIA_CSV_HEADERS = [
  "매체명",
  "유형",
  "주소",
  "월단가",
  "규격",
  "노출수",
  "설명",
] as const;

export type MediaCsvRow = {
  rowIndex: number;
  name: string;
  type: string;
  location: string;
  price: number;
  spec: string;
  width: string | null;
  height: string | null;
  exposure: number | null;
  description: string;
  region: string;
};

export type MediaCsvRowError = {
  rowIndex: number;
  field: string;
  message: string;
};

export type MediaCsvParseResult = {
  rows: MediaCsvRow[];
  errors: MediaCsvRowError[];
};

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** 간단 CSV 파서 (따옴표·쉼표 지원) */
export function parseCsvText(text: string): string[][] {
  const lines = stripBom(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const out: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        row.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    row.push(cur.trim());
    out.push(row);
  }
  return out;
}

function parseSpec(spec: string): { width: string | null; height: string | null } {
  const t = spec.trim();
  if (!t) return { width: null, height: null };
  const m = t.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (m) {
    return { width: m[1]!, height: m[2]! };
  }
  return { width: t, height: null };
}

function parsePrice(raw: string): number | null {
  const n = Number(String(raw).replace(/[,₩원\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function parseExposure(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function normalizeTypeInput(raw: string): string {
  const t = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    디지털: "digital",
    digital: "digital",
    dooh: "digital",
    정적: "static",
    static: "static",
    옥외: "static",
    빌보드: "static",
    이동: "mobile",
    mobile: "mobile",
    래핑: "mobile",
  };
  return map[t] ?? t;
}

export function mediaCsvTemplateUtf8(): string {
  const header = MEDIA_CSV_HEADERS.join(",");
  const sample = [
    "강남역 디지털 빌보드",
    "digital",
    "서울 강남구 강남대로 396",
    "35000000",
    "12x4m",
    "150000",
    "고유동 상권 메인 도로변",
  ].join(",");
  return `\uFEFF${header}\n${sample}\n`;
}

export function parseMediaCsv(text: string): MediaCsvParseResult {
  const grid = parseCsvText(text);
  if (grid.length === 0) {
    return { rows: [], errors: [{ rowIndex: 0, field: "file", message: "CSV가 비어 있습니다." }] };
  }

  const header = grid[0]!.map((h) => h.trim());
  const expected = [...MEDIA_CSV_HEADERS];
  const headerOk =
    header.length >= expected.length &&
    expected.every((col, i) => header[i] === col);

  const dataRows = headerOk ? grid.slice(1) : grid;
  const startRow = headerOk ? 2 : 1;

  const rows: MediaCsvRow[] = [];
  const errors: MediaCsvRowError[] = [];

  dataRows.forEach((cells, idx) => {
    const rowIndex = startRow + idx;
    const get = (i: number) => (cells[i] ?? "").trim();

    const name = get(0);
    const typeRaw = get(1);
    const location = get(2);
    const priceRaw = get(3);
    const spec = get(4);
    const exposureRaw = get(5);
    const description = get(6);

    if (!name && !location && !typeRaw) return;

    if (!name) {
      errors.push({ rowIndex, field: "매체명", message: "매체명이 비어 있습니다." });
    }
    if (!location) {
      errors.push({ rowIndex, field: "주소", message: "주소가 비어 있습니다." });
    }

    const type = normalizeTypeInput(typeRaw);
    if (!typeRaw) {
      errors.push({ rowIndex, field: "유형", message: "유형이 비어 있습니다." });
    } else if (!isValidCatalogMediaType(type)) {
      errors.push({
        rowIndex,
        field: "유형",
        message: `유형은 ${CATALOG_MEDIA_TYPES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const price = parsePrice(priceRaw);
    if (priceRaw && price === null) {
      errors.push({ rowIndex, field: "월단가", message: "월단가 형식이 올바르지 않습니다." });
    }

    const exposure = parseExposure(exposureRaw);
    if (exposureRaw && exposure === null) {
      errors.push({ rowIndex, field: "노출수", message: "노출수 형식이 올바르지 않습니다." });
    }

    const { width, height } = parseSpec(spec);
    const region = location
      ? deriveRegionFromAddress("", "", location)
      : "seoul";

    if (name && location && isValidCatalogMediaType(type)) {
      rows.push({
        rowIndex,
        name,
        type,
        location,
        price: price ?? 0,
        spec,
        width,
        height,
        exposure,
        description,
        region,
      });
    }
  });

  return { rows, errors };
}
