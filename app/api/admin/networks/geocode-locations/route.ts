import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";
import { browseRegionsFromGeocodeHit } from "@/lib/network-location-enrich";

export const dynamic = "force-dynamic";

type RowIn = { name?: unknown; address?: unknown };

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }
  const rowsIn = (body as Record<string, unknown>).rows;
  if (!Array.isArray(rowsIn)) {
    return json({ error: "rows array required" }, 400);
  }

  const out: Array<{
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    regionMain: string | null;
    regionSub: string | null;
    geocodeQuery?: string | null;
  }> = [];

  for (const x of rowsIn as RowIn[]) {
    if (!x || typeof x !== "object") continue;
    const name =
      typeof x.name === "string" ? x.name.trim() : String(x.name ?? "").trim();
    if (!name) continue;
    const address =
      typeof x.address === "string" ? x.address.trim() : "";
    const addrNorm = address || null;

    if (!addrNorm) {
      out.push({
        name,
        address: null,
        latitude: null,
        longitude: null,
        regionMain: null,
        regionSub: null,
        geocodeQuery: null,
      });
      continue;
    }

    const hit = await geocodeAddressWithKakao(addrNorm);
    const regions = hit
      ? browseRegionsFromGeocodeHit({
          city: hit.city,
          district: hit.district,
          addressName: hit.addressName,
        })
      : { regionMain: null, regionSub: null };

    out.push({
      name,
      address: addrNorm,
      latitude: hit?.latitude ?? null,
      longitude: hit?.longitude ?? null,
      regionMain: regions.regionMain,
      regionSub: regions.regionSub,
      geocodeQuery: hit?.addressName ?? addrNorm,
    });
  }

  return json({ locations: out });
}
