import { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import {
  buildNearbyFacilitiesText,
  findNearestSubwayStation,
} from "@/lib/kakao-nearby-pois";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const o = body as Record<string, unknown>;
  const lat = Number(o.latitude);
  const lng = Number(o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: "latitude, longitude가 필요합니다." }, 400);
  }

  const [nearbyFacilities, subway] = await Promise.all([
    buildNearbyFacilitiesText({ latitude: lat, longitude: lng, radiusM: 500 }),
    findNearestSubwayStation({ latitude: lat, longitude: lng, radiusM: 500 }),
  ]);

  return json({
    nearbyFacilities,
    nearestSubway: subway
      ? { name: subway.placeName, distanceM: subway.distanceM }
      : null,
  });
}
