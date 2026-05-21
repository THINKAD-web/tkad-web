/**
 * Google Places Text Search (선택) — GOOGLE_PLACES_API_KEY 설정 시 사용
 */

export type GooglePlaceHit = {
  externalPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
};

function getGooglePlacesKey(): string | null {
  const k =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();
  return k || null;
}

export function isGooglePlacesConfigured(): boolean {
  return !!getGooglePlacesKey();
}

export async function searchGooglePlacesText(opts: {
  query: string;
  lat: number;
  lng: number;
  radiusM?: number;
}): Promise<GooglePlaceHit[]> {
  const key = getGooglePlacesKey();
  if (!key) return [];

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
  );
  url.searchParams.set("query", opts.query);
  url.searchParams.set("location", `${opts.lat},${opts.lng}`);
  url.searchParams.set(
    "radius",
    String(Math.min(50000, opts.radiusM ?? 20000)),
  );
  url.searchParams.set("language", "ko");
  url.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  type GResult = {
    results?: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
    status?: string;
  };

  let json: GResult;
  try {
    json = (await res.json()) as GResult;
  } catch {
    return [];
  }
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") return [];

  return (json.results ?? [])
    .map((r) => {
      const id = r.place_id?.trim();
      const name = r.name?.trim();
      const address = r.formatted_address?.trim();
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (!id || !name || !address || lat == null || lng == null) return null;
      return {
        externalPlaceId: id,
        name,
        address,
        lat,
        lng,
        phone: null as string | null,
      };
    })
    .filter((x): x is GooglePlaceHit => x !== null);
}
