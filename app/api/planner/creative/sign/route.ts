import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** @deprecated Use POST `/api/planner/creative/upload` (multipart). */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Deprecated. Use POST /api/planner/creative/upload with multipart form data.",
    },
    { status: 410 },
  );
}
