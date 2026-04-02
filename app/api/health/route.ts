import { NextResponse } from "next/server";

/** Short CDN cache for lightweight status checks (monitoring, LB probes). */
export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
