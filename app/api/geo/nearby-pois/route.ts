import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyMapPois } from "@/lib/kakao-nearby-pois";

export const dynamic = "force-dynamic";

/** 공개 매체 상세 지도 — 반경 내 POI (지하철·카페·편의점). */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const radius = Number(request.nextUrl.searchParams.get("radius") ?? "200");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 },
    );
  }

  const pois = await fetchNearbyMapPois({
    latitude: lat,
    longitude: lng,
    radiusM: Number.isFinite(radius) ? radius : 200,
  });

  return NextResponse.json(
    { pois, radiusM: Number.isFinite(radius) ? radius : 200 },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
