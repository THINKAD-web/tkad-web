import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const status = request.nextUrl.searchParams.get("status")?.trim();
  const db = getPrisma();
  const where =
    status && ["draft", "reviewed", "published"].includes(status)
      ? { status }
      : {};

  const trendReports = await db.trendReport.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
  });

  return json({ trendReports });
}
