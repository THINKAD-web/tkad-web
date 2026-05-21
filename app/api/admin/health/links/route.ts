import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { scanInternalLinks } from "@/lib/link-health";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "ko";
  const baseUrl = url.searchParams.get("baseUrl") ?? undefined;
  const mediaLimit = Number(url.searchParams.get("mediaLimit") ?? "40");

  try {
    const result = await scanInternalLinks({
      locale,
      baseUrl,
      mediaLimit: Number.isFinite(mediaLimit) ? mediaLimit : 40,
    });
    return json({ success: true, ...result });
  } catch (e) {
    console.error("[admin/health/links]", e);
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "scan_failed",
      },
      500,
    );
  }
}
