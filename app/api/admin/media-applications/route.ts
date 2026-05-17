import { NextRequest } from "next/server";
import type { MediaApplicationStatus } from "@prisma/client";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { MEDIA_APPLICATION_STATUSES } from "@/lib/media-application";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const statusRaw = request.nextUrl.searchParams.get("status")?.trim();
  const status =
    statusRaw &&
    MEDIA_APPLICATION_STATUSES.includes(statusRaw as MediaApplicationStatus)
      ? (statusRaw as MediaApplicationStatus)
      : undefined;

  try {
    const db = getPrisma();
    const applications = await db.mediaApplication.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return json({ applications });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
