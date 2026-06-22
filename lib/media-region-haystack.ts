import type { MediaItem } from "@/lib/media-data";

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

  return parts.filter(Boolean).join(" ").toLowerCase();
}
