import { NextResponse } from "next/server";
import {
  fetchPublicMediaCatalog,
  PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS,
} from "@/lib/public-media-catalog";

/** CDN cache aligned with unstable_cache catalog TTL (admin save → tag revalidate). */
export const revalidate = PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS;

const CDN_MAX_AGE = PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS;
const CDN_SWR = CDN_MAX_AGE * 2;

export async function GET() {
  try {
    const items = await fetchPublicMediaCatalog();
    return NextResponse.json(items, {
      headers: {
        "Cache-Control": `public, max-age=${CDN_MAX_AGE}, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${CDN_SWR}`,
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
