import { NextResponse } from "next/server";
import { fetchPublicMediaFilterCounts } from "@/lib/public-media-filter-counts";
import { PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS } from "@/lib/public-media-catalog";

/** CDN cache aligned with public media catalog TTL (admin save → tag revalidate). */
export const revalidate = 3600;

const CDN_MAX_AGE = PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS;
const CDN_SWR = CDN_MAX_AGE * 2;

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const browseChannel =
      sp.get("browseChannel") === "online" ? "online" : "offline";
    const counts = await fetchPublicMediaFilterCounts(browseChannel);
    return NextResponse.json(counts, {
      headers: {
        "Cache-Control": `public, max-age=${CDN_MAX_AGE}, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_SWR}`,
      },
    });
  } catch {
    return NextResponse.json(
      { subCategory: {}, regionSub: {}, networkFeature: 0 },
      { status: 200 },
    );
  }
}
