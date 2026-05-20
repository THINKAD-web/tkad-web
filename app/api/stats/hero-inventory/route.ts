import { NextResponse } from "next/server";
import { fetchHomeHeroInventoryStats } from "@/lib/home-hero-stats";

export async function GET() {
  const data = await fetchHomeHeroInventoryStats();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
