import {
  inferBrowseRegionFromMedia,
  MEDIA_BROWSE_REGIONS,
} from "@/lib/media-browse-regions";
import {
  inferRegionMainFromAddress,
  inferRegionSubFromAddress,
  inferRegionsFromAddresses,
} from "@/lib/network-quick-add";

export type NetworkLocationInput = {
  name: string;
  address?: string | null;
  fullAddress?: string | null;
  regionMain?: string | null;
  regionSub?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unitCount?: number | null;
  priceNote?: string | null;
  dailyFootfall?: number | null;
  note?: string | null;
};

export type EnrichedNetworkLocation = {
  name: string;
  address: string | null;
  fullAddress: string | null;
  regionMain: string | null;
  regionSub: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number;
  priceNote: string | null;
  dailyFootfall: number | null;
  note: string | null;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

/** 자유 텍스트·chip id → browse `regionMain` id */
export function normalizeBrowseRegionMainId(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const byId = MEDIA_BROWSE_REGIONS.find((m) => m.id === lower || m.id === t);
  if (byId) return byId.id;
  for (const main of MEDIA_BROWSE_REGIONS) {
    if (t === main.label || t.includes(main.label)) return main.id;
    if (main.labelEn && lower === main.labelEn.toLowerCase()) return main.id;
  }
  const fromInfer = inferRegionMainFromAddress(t);
  if (fromInfer) {
    const hit = MEDIA_BROWSE_REGIONS.find((m) => m.label === fromInfer);
    if (hit) return hit.id;
  }
  return null;
}

/** 자유 텍스트·chip id → browse `regionSub` id (main 힌트 있으면 우선) */
export function normalizeBrowseRegionSubId(
  raw: string | null | undefined,
  mainId: string | null,
): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (mainId) {
    const main = MEDIA_BROWSE_REGIONS.find((m) => m.id === mainId);
    if (main) {
      const byId = main.sub.find((s) => s.id === lower || s.id === t);
      if (byId) return byId.id;
      for (const sub of main.sub) {
        if (t === sub.label || sub.aliases?.some((a) => t.includes(a))) {
          return sub.id;
        }
      }
    }
  }
  for (const main of MEDIA_BROWSE_REGIONS) {
    for (const sub of main.sub) {
      if (sub.id === lower || sub.id === t) return sub.id;
      if (t === sub.label || sub.aliases?.some((a) => t.includes(a))) {
        return sub.id;
      }
    }
  }
  return null;
}

/** 주소·기존 값 → browse chip id (저장·공개 매핑 공통) */
export function resolveBrowseRegionIds(input: {
  regionMain?: string | null;
  regionSub?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
}): { regionMain: string | null; regionSub: string | null } {
  let regionMain =
    normalizeBrowseRegionMainId(input.regionMain) ??
    normalizeBrowseRegionMainId(input.city);
  let regionSub = normalizeBrowseRegionSubId(input.regionSub, regionMain);

  const address = str(input.address) || str(input.city);
  if (address) {
    if (!regionMain) {
      regionMain =
        normalizeBrowseRegionMainId(inferRegionMainFromAddress(address)) ??
        inferBrowseRegionFromMedia({
          city: inferRegionMainFromAddress(address),
          district: inferRegionSubFromAddress(address),
          location: address,
        }).main;
    }
    if (!regionSub) {
      const subFromAddr = inferRegionSubFromAddress(address);
      regionSub =
        normalizeBrowseRegionSubId(subFromAddr, regionMain) ??
        inferBrowseRegionFromMedia({
          city: input.city ?? inferRegionMainFromAddress(address),
          district: subFromAddr ?? input.district,
          location: address,
        }).sub;
    }
  }

  if (!regionMain && !regionSub) {
    const inferred = inferBrowseRegionFromMedia({
      city: input.city,
      district: input.district,
      location: address || undefined,
    });
    regionMain = inferred.main;
    regionSub = inferred.sub;
  } else if (!regionSub && regionMain) {
    const inferred = inferBrowseRegionFromMedia({
      city: input.city,
      district: input.district,
      location: address || undefined,
      region: regionMain,
    });
    regionSub = inferred.sub;
  }

  return { regionMain, regionSub };
}

/** chip id → `regions[]`용 한글 라벨 (네트워크 API 호환) */
export function browseRegionMainIdToLabel(mainId: string | null): string | null {
  if (!mainId?.trim()) return null;
  const main = MEDIA_BROWSE_REGIONS.find(
    (m) => m.id === mainId.trim() || m.label === mainId.trim(),
  );
  return main?.label ?? null;
}

export function enrichNetworkLocation(
  loc: NetworkLocationInput,
): EnrichedNetworkLocation {
  const name = str(loc.name);
  const address = str(loc.address) || null;
  const fullAddress = str(loc.fullAddress) || address;

  const { regionMain, regionSub } = resolveBrowseRegionIds({
    regionMain: loc.regionMain,
    regionSub: loc.regionSub,
    address: fullAddress ?? address,
  });

  const lat = loc.latitude != null ? Number(loc.latitude) : null;
  const lng = loc.longitude != null ? Number(loc.longitude) : null;
  const unitRaw = optInt(loc.unitCount);

  return {
    name,
    address,
    fullAddress,
    regionMain,
    regionSub,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    unitCount: unitRaw != null && unitRaw >= 1 ? unitRaw : 1,
    priceNote: str(loc.priceNote) || null,
    dailyFootfall: (() => {
      const df = optInt(loc.dailyFootfall);
      return df != null && df >= 0 ? df : null;
    })(),
    note: str(loc.note) || null,
  };
}

export function enrichNetworkLocations(
  locations: NetworkLocationInput[],
): EnrichedNetworkLocation[] {
  const out: EnrichedNetworkLocation[] = [];
  for (const loc of locations) {
    if (!str(loc.name)) continue;
    out.push(enrichNetworkLocation(loc));
  }
  return out;
}

/** 수동 `regions[]` 없거나 비면 지점 주소·시도에서 집계 (한글 라벨) */
export function resolveNetworkRegionsArray(
  manualRegions: string[] | undefined,
  locations: EnrichedNetworkLocation[],
): string[] {
  const manual = (manualRegions ?? []).map((s) => s.trim()).filter(Boolean);
  if (manual.length > 0) return [...new Set(manual)];

  const fromAddresses = inferRegionsFromAddresses(
    locations.map((l) => l.fullAddress ?? l.address ?? "").filter(Boolean),
  );

  const fromChips = locations
    .map((l) => browseRegionMainIdToLabel(l.regionMain))
    .filter((v): v is string => Boolean(v));

  return [...new Set([...fromAddresses, ...fromChips])];
}

/** Kakao geocode hit → browse region ids */
export function browseRegionsFromGeocodeHit(input: {
  city: string;
  district: string;
  addressName: string;
}): { regionMain: string | null; regionSub: string | null } {
  const hay = [input.addressName, input.city, input.district]
    .filter(Boolean)
    .join(" ");
  return resolveBrowseRegionIds({
    city: input.city,
    district: input.district,
    address: hay,
  });
}
