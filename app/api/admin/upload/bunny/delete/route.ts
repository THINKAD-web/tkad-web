import { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionDetails,
} from "@/lib/admin-session";
import { json } from "@/lib/admin-guard";
import {
  bunnyPathFromPublicUrl,
  deleteFromBunnyStorage,
  isBunnyStorageConfigured,
} from "@/lib/bunny-storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSessionDetails(token);
  if (!session.ok) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isBunnyStorageConfigured()) {
    return json({ error: "Bunny storage not configured" }, 503);
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const url = String(body.url ?? "").trim();
  if (!url) {
    return json({ error: "url required" }, 400);
  }

  const path = bunnyPathFromPublicUrl(url);
  if (!path) {
    return json({ error: "URL is not a Bunny CDN asset for this project" }, 400);
  }

  try {
    await deleteFromBunnyStorage(path);
    return json({ ok: true, path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}
