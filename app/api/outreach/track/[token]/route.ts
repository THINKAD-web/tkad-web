import { NextRequest, NextResponse } from "next/server";
import { recordOutreachEmailOpen } from "@/lib/media-owner-outreach";

export const dynamic = "force-dynamic";

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token: raw } = await params;
  const token = raw.replace(/\.gif$/i, "");
  void recordOutreachEmailOpen(token);

  return new NextResponse(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, private",
    },
  });
}
