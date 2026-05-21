import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ logs: [], configured: false });
  }

  const limit = Math.min(
    100,
    Math.max(10, Number(request.nextUrl.searchParams.get("limit") ?? "50") || 50),
  );
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();

  const db = getPrisma();
  const logs = await db.supportChatLog.findMany({
    where: sessionId ? { sessionId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      userId: true,
      locale: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return json({
    configured: true,
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
