import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const parseFloatOrNull = (v: string | null): number | null => {
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const parseIntOrNull = (v: string | null): number | null => {
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.floor(n) : null;
    };

    const swLat = parseFloatOrNull(sp.get("swLat"));
    const swLng = parseFloatOrNull(sp.get("swLng"));
    const neLat = parseFloatOrNull(sp.get("neLat"));
    const neLng = parseFloatOrNull(sp.get("neLng"));

    const type = sp.get("type")?.trim() || null;
    const region = sp.get("region")?.trim() || null;
    const priceMin = parseIntOrNull(sp.get("priceMin"));
    const priceMax = parseIntOrNull(sp.get("priceMax"));
    const q = sp.get("q")?.trim().toLowerCase() || null;
    const sort = sp.get("sort")?.trim() || "default";

    const all = await fetchPublicMediaCatalog();

    const itemsRaw = all
      .map((m) => {
        const lat = Number(m.lat);
        const lng = Number(m.lng);
        return { m, lat, lng };
      })
      .filter(
        (row) =>
          Number.isFinite(row.lat) &&
          Number.isFinite(row.lng) &&
          Math.abs(row.lat) <= 90 &&
          Math.abs(row.lng) <= 180,
      )
      .filter((row) => {
        const { m, lat, lng } = row;
        if (swLat != null && neLat != null && swLng != null && neLng != null) {
          if (lat < swLat || lat > neLat) return false;
          if (lng < swLng || lng > neLng) return false;
        }
        if (type && m.type !== type) return false;
        if (region && m.region !== region && m.city !== region && m.district !== region)
          return false;
        const priceWon = catalogPriceFieldToWon(m.price ?? 0);
        if (priceMin != null && priceWon < priceMin) return false;
        if (priceMax != null && priceWon > priceMax) return false;
        if (q) {
          const hay = [m.name, m.location, m.region, m.city, m.district]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map(({ m, lat, lng }) => ({
        id: m.id,
        name: m.name,
        location: m.location,
        region: m.region,
        city: m.city ?? null,
        district: m.district ?? null,
        type: m.type,
        subCategory: m.subCategory ?? null,
        price: catalogPriceFieldToWon(m.price ?? 0),
        pricePeriod: m.pricePeriod ?? "month",
        createdAt: m.createdAt ?? null,
        lat,
        lng,
        image: m.sampleImages?.[0] ?? null,
        availability: m.availability ?? null,
        visibilityScore: m.visibilityScore ?? 0,
      }));

    const items = (() => {
      const arr = [...itemsRaw];
      switch (sort) {
        case "newest":
          return arr.sort((a, b) => {
            const at = a.createdAt ? Date.parse(a.createdAt) : 0;
            const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
            return bt - at;
          });
        case "priceAsc":
          return arr.sort((a, b) => a.price - b.price);
        case "priceDesc":
          return arr.sort((a, b) => b.price - a.price);
        case "trafficDesc":
          // map API는 traffic 지표가 없으므로 visibilityScore를 근사치로 사용한다.
          return arr.sort((a, b) => b.visibilityScore - a.visibilityScore);
        default:
          return arr;
      }
    })();

    const distinctRegions = Array.from(
      new Set(all.map((m) => m.region).filter((v): v is string => !!v)),
    ).sort();
    const distinctTypes = Array.from(
      new Set(all.map((m) => m.type).filter((v): v is string => !!v)),
    ).sort();

    return apiOk({
      items,
      total: items.length,
      facets: { regions: distinctRegions, types: distinctTypes },
    });
  } catch (e) {
    return apiServerError(e, "media/map");
  }
}
