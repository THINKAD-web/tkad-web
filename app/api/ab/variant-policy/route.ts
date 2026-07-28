import { NextResponse } from "next/server";
import { getForcedAbVariant } from "@/lib/ab-test-db";

/** Short CDN cache for AB forced-variant policy (B2). */
export const revalidate = 30;

export async function GET() {
  const forcedVariant = await getForcedAbVariant();
  return NextResponse.json(
    { forcedVariant },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
