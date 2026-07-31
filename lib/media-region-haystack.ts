import type { MediaItem } from "@/lib/media-data";
import { getSigunguCoverage } from "@/lib/geo/korea-sgg-coverage";

/** Region / location matching haystack — includes network branch rows. */
export function mediaRegionHaystack(m: MediaItem): string {
  const parts: string[] = [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.region,
    m.regionZone,
    m.regionMain,
    m.regionSub,
    m.subCategory,
    m.nearbyStations,
    m.nearbyLandmarks,
    m.nearbyFacilities,
    m.features,
    ...(m.tags ?? []),
    ...(m.networkRegionLabels ?? []),
  ];

  for (const loc of m.networkLocations ?? []) {
    parts.push(loc.name, loc.address, loc.regionMain, loc.regionSub);
  }

  for (const loc of m.installLocations ?? []) {
    parts.push(loc.label, loc.location);
  }

  for (const code of m.coverageDistrictCodes ?? []) {
    const row = getSigunguCoverage(code);
    if (row) {
      parts.push(row.code, row.nameKo, row.sidoName, shortSidoName(row.sidoName));
    }
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

function shortSidoName(sidoName: string): string {
  return sidoName
    .replace(/특별자치시$/, "")
    .replace(/특별자치도$/, "")
    .replace(/특별시$/, "")
    .replace(/광역시$/, "")
    .replace(/도$/, "")
    .trim();
}
