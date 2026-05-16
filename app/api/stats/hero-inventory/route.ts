import { NextResponse } from "next/server";
import { fetchHomeHeroInventoryStats } from "@/lib/home-hero-stats";

export async function GET() {
  const data = await fetchHomeHeroInventoryStats();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
