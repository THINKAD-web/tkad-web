import { NextResponse } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 300;

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
