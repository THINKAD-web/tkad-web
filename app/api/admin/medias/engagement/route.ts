import type { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import { loadMediaEngagementMap } from "@/lib/admin-media-engagement";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  const engagement = await loadMediaEngagementMap();
  return json({ engagement });
}
