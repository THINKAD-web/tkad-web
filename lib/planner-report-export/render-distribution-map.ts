import { plannerChartColor } from "@/lib/planner-chart-colors";
import { boundsFromMapMarkers, isCatalogFallbackCoordinate } from "@/lib/planner-report-portfolio-map";

/** 분포도 렌더 전용 — export 파이프라인에서는 미사용 (화면 미니맵만 유지) */
export type PlannerExportMapPin = {
  id: string;
  lat: number;
  lng: number;
  type: string;
  name: string;
};

export type PlannerReportDistributionMap = {
  dataUrl: string;
  mappableMediaCount: number;
  locationCount: number;
};

const WIDTH = 800;
const HEIGHT = 450;
const PAD = 48;

/** 대한민국 대략 범위 — 배경 윤곽(타일·GeoJSON 없음) */
const KOREA_BOUNDS = {
  swLat: 33.0,
  neLat: 38.65,
  swLng: 124.5,
  neLng: 132.0,
};

function isValidPin(pin: PlannerExportMapPin): boolean {
  return (
    typeof pin.id === "string" &&
    pin.id.length > 0 &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng) &&
    !isCatalogFallbackCoordinate(pin.lat, pin.lng) &&
    !(pin.lat === 0 && pin.lng === 0)
  );
}

function normalizePins(pins: readonly PlannerExportMapPin[]): PlannerExportMapPin[] {
  return pins.filter(isValidPin);
}

function expandBounds(
  bounds: NonNullable<ReturnType<typeof boundsFromMapMarkers>>,
  minSpan = 0.08,
) {
  let { swLat, swLng, neLat, neLng } = bounds;
  const latSpan = neLat - swLat;
  const lngSpan = neLng - swLng;
  if (latSpan < minSpan) {
    const mid = (swLat + neLat) / 2;
    swLat = mid - minSpan / 2;
    neLat = mid + minSpan / 2;
  }
  if (lngSpan < minSpan) {
    const mid = (swLng + neLng) / 2;
    swLng = mid - minSpan / 2;
    neLng = mid + minSpan / 2;
  }
  const padLat = (neLat - swLat) * 0.12;
  const padLng = (neLng - swLng) * 0.12;
  return {
    swLat: swLat - padLat,
    swLng: swLng - padLng,
    neLat: neLat + padLat,
    neLng: neLng + padLng,
  };
}

function project(
  lat: number,
  lng: number,
  bounds: ReturnType<typeof expandBounds>,
): { x: number; y: number } {
  const plotW = WIDTH - PAD * 2;
  const plotH = HEIGHT - PAD * 2;
  const x = PAD + ((lng - bounds.swLng) / (bounds.neLng - bounds.swLng)) * plotW;
  const y = PAD + ((bounds.neLat - lat) / (bounds.neLat - bounds.swLat)) * plotH;
  return { x, y };
}

function groupKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeMediaTypeKey(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("digital")) return "dooh";
  if (t.includes("mobile") || t.includes("transport")) return "mobile";
  if (t.includes("network")) return "network";
  if (t.includes("static") || t.includes("billboard")) return "static";
  return t || "other";
}

function buildSvg(pins: PlannerExportMapPin[], isKo: boolean): string {
  const markerLike = pins.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    price: 0,
    type: p.type,
    name: p.name,
  }));
  const rawBounds = boundsFromMapMarkers(markerLike);
  if (!rawBounds) return "";
  const bounds = expandBounds(rawBounds);

  const plotW = WIDTH - PAD * 2;
  const plotH = HEIGHT - PAD * 2;

  const koreaTL = project(KOREA_BOUNDS.neLat, KOREA_BOUNDS.swLng, bounds);
  const koreaBR = project(KOREA_BOUNDS.swLat, KOREA_BOUNDS.neLng, bounds);
  const koreaX = Math.min(koreaTL.x, koreaBR.x);
  const koreaY = Math.min(koreaTL.y, koreaBR.y);
  const koreaW = Math.abs(koreaBR.x - koreaTL.x);
  const koreaH = Math.abs(koreaBR.y - koreaTL.y);

  const gridLines: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const gx = PAD + (plotW * i) / 5;
    const gy = PAD + (plotH * i) / 5;
    gridLines.push(
      `<line x1="${gx}" y1="${PAD}" x2="${gx}" y2="${HEIGHT - PAD}" stroke="#E8EAEF" stroke-width="1"/>`,
      `<line x1="${PAD}" y1="${gy}" x2="${WIDTH - PAD}" y2="${gy}" stroke="#E8EAEF" stroke-width="1"/>`,
    );
  }

  const groups = new Map<string, PlannerExportMapPin[]>();
  for (const pin of pins) {
    const key = groupKey(pin.lat, pin.lng);
    const list = groups.get(key) ?? [];
    list.push(pin);
    groups.set(key, list);
  }

  const pinEls: string[] = [];
  for (const group of groups.values()) {
    const base = project(group[0]!.lat, group[0]!.lng, bounds);
    group.forEach((pin, idx) => {
      const angle = (2 * Math.PI * idx) / group.length;
      const r = group.length > 1 ? 7 : 0;
      const x = base.x + Math.cos(angle) * r;
      const y = base.y + Math.sin(angle) * r;
      const color = plannerChartColor(normalizeMediaTypeKey(pin.type), idx);
      pinEls.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${color}" stroke="#ffffff" stroke-width="2"><title>${escapeXml(pin.name)}</title></circle>`,
      );
    });
  }

  const legendTypes = ["static", "dooh", "mobile", "network"] as const;
  const legendLabelsKo: Record<string, string> = {
    static: "고정형",
    dooh: "디지털",
    mobile: "이동형",
    network: "네트워크",
  };
  const legendLabelsEn: Record<string, string> = {
    static: "Static",
    digital: "Digital",
    dooh: "Digital",
    mobile: "Mobile",
    network: "Network",
  };
  const legend = legendTypes
    .map((key, i) => {
      const lx = PAD + i * 118;
      const ly = HEIGHT - 22;
      const label = isKo ? legendLabelsKo[key] : legendLabelsEn[key];
      const color = plannerChartColor(key, i);
      return `<circle cx="${lx}" cy="${ly}" r="5" fill="${color}"/><text x="${lx + 10}" y="${ly + 4}" font-family="Arial,sans-serif" font-size="11" fill="#6B7280">${label}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#F8F9FC" rx="12"/>
  <rect x="${PAD}" y="${PAD}" width="${plotW}" height="${plotH}" fill="#FFFFFF" stroke="#E4E6EC" stroke-width="1.5" rx="8"/>
  <rect x="${koreaX.toFixed(1)}" y="${koreaY.toFixed(1)}" width="${koreaW.toFixed(1)}" height="${koreaH.toFixed(1)}" fill="none" stroke="#D1D5DB" stroke-width="1.5" stroke-dasharray="6 4" rx="6"/>
  ${gridLines.join("\n  ")}
  ${pinEls.join("\n  ")}
  ${legend}
</svg>`;
}

/** 서버 — 분포도 PNG/JPEG data URL (타일·외부 API 없음) */
export async function renderPlannerDistributionMap(
  pins: readonly PlannerExportMapPin[],
  isKo: boolean,
): Promise<PlannerReportDistributionMap | null> {
  const valid = normalizePins(pins);
  if (valid.length === 0) return null;

  const svg = buildSvg(valid, isKo);
  if (!svg) return null;

  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    const mediaIds = new Set(valid.map((p) => p.id));
    return {
      dataUrl,
      mappableMediaCount: mediaIds.size,
      locationCount: valid.length,
    };
  } catch {
    return null;
  }
}

export function parseExportMapPins(raw: unknown): PlannerExportMapPin[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PlannerExportMapPin[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id.trim()) continue;
    if (typeof o.lat !== "number" || typeof o.lng !== "number") continue;
    if (typeof o.type !== "string" || typeof o.name !== "string") continue;
    const pin: PlannerExportMapPin = {
      id: o.id.trim(),
      lat: o.lat,
      lng: o.lng,
      type: o.type,
      name: o.name,
    };
    if (!isValidPin(pin)) continue;
    out.push(pin);
  }
  return out.length > 0 ? out : undefined;
}
