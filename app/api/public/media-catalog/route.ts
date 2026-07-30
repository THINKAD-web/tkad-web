import { NextResponse } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

/** CDN-friendly public catalog — ISR 30m (B2). */
export const revalidate = 1800;

export async function GET() {
  try {
    const items = await fetchPublicMediaCatalog();
    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
