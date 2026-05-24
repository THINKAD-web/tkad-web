import { NextResponse } from "next/server";
import { getPlatformPredictionAccuracy } from "@/lib/prediction-accuracy-server";

export const revalidate = 3600;

export async function GET() {
  const accuracy = await getPlatformPredictionAccuracy();
  return NextResponse.json(accuracy, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
