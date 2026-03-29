import { NextResponse } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 60;

export async function GET() {
  try {
    const items = await fetchPublicMediaCatalog();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
