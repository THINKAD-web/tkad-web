import { NextResponse } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await fetchPublicMediaCatalog();
    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
