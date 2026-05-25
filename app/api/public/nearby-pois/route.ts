import { NextResponse } from "next/server";
import {
  addressAreaFallbackText,
  fetchNearbyPoiDisplayItems,
} from "@/lib/kakao-nearby-poi-display";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const locale = searchParams.get("locale") ?? "ko";
  const isKo = locale.startsWith("ko");
  const address = searchParams.get("address") ?? "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, items: [], fallback: null });
  }

  const items = await fetchNearbyPoiDisplayItems({
    latitude: lat,
    longitude: lng,
    isKo,
  });

  if (items?.length) {
    return NextResponse.json({
      ok: true,
      source: "kakao",
      items: items.map((x) => x.label),
      details: items,
    });
  }

  const fallback = address
    ? addressAreaFallbackText(address, isKo)
    : null;

  return NextResponse.json({
    ok: true,
    source: fallback ? "address" : "empty",
    items: fallback ? [fallback] : [],
    fallback,
  });
}
