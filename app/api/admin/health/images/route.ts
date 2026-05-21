import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { scanBrokenMediaImages } from "@/lib/media-image-health";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const result = await scanBrokenMediaImages();
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[admin/health/images]", e);
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "scan_failed",
      },
      500,
    );
  }
}
