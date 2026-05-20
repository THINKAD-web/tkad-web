import { normalizeMediaLocationFields } from "@/lib/media-regions";

/** 저장 직전 region / regionZone / city / district 정규화 */
export function applyNormalizedMediaLocation<
  T extends {
    location?: string;
    city?: string | null;
    district?: string | null;
    region?: string;
    regionZone?: string | null;
  },
>(data: T): T {
  const loc = normalizeMediaLocationFields({
    city: data.city,
    district: data.district,
    location: data.location,
    region: data.region,
    regionZone: data.regionZone,
  });
  data.region = loc.region;
  data.regionZone = loc.regionZone;
  if (loc.city) data.city = loc.city;
  if (loc.district) data.district = loc.district;
  return data;
}
